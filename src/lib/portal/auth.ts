import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

export type Role = "staff" | "client";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  clientId: number | null;
  mustChangePassword: boolean;
};

export const SESSION_COOKIE = "cj_portal";
const SESSION_DAYS = 30;
export const MIN_PASSWORD = 10;

// ---------- passwords ----------

const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  return "";
}

/** A readable temporary password, e.g. "maple-river-4821". */
export function temporaryPassword() {
  const words = ["maple", "river", "cotton", "harbor", "canvas", "denim", "meadow", "copper", "linen", "summit", "willow", "amber", "cedar", "indigo", "marble", "orchard"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  return `${pick()}-${pick()}-${1000 + (randomBytes(2).readUInt16BE(0) % 9000)}`;
}

// ---------- session cookie ----------

function secret() {
  const value = process.env.PORTAL_SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error("PORTAL_SESSION_SECRET must be set to at least 16 characters.");
  }
  return value;
}

const encoder = new TextEncoder();

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Buffer.from(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))).toString("base64url");
}

function sameString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function startSession(userId: number, sessionVersion: number) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${sessionVersion}.${expires}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Changing a password ends that user's other sessions. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [id, version, expires, signature] = token.split(".");
  if (!id || !version || !expires || !signature || !(Number(expires) > Date.now())) return null;
  if (!sameString(signature, await sign(`${id}.${version}.${expires}`))) return null;
  const sql = await db();
  const [row] = await sql`select * from users where id = ${Number(id)} and session_version = ${Number(version)}`;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    clientId: row.client_id,
    mustChangePassword: row.must_change_password,
  };
}

/**
 * Checks an email and password. The very first staff account is created from
 * PORTAL_ADMIN_EMAIL / PORTAL_ADMIN_PASSWORD the first time someone signs in
 * with them; after that those variables are ignored.
 */
export async function login(email: string, password: string) {
  const sql = await db();
  const normalized = email.trim().toLowerCase();
  let [row] = await sql`select * from users where lower(email) = ${normalized}`;

  if (!row) {
    const adminEmail = process.env.PORTAL_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.PORTAL_ADMIN_PASSWORD;
    if (adminEmail && adminPassword && normalized === adminEmail && sameString(password, adminPassword)) {
      const [{ n }] = await sql`select count(*)::int as n from users where role = 'staff'`;
      if (n === 0) {
        [row] = await sql`
          insert into users (email, name, password_hash, role)
          values (${normalized}, 'Admin', ${await hashPassword(password)}, 'staff')
          returning *`;
      }
    }
  }

  if (!row || !(await verifyPassword(password, row.password_hash))) return null;
  await sql`update users set last_login_at = now() where id = ${row.id}`;
  await startSession(row.id, row.session_version);
  return { role: row.role as Role, mustChangePassword: Boolean(row.must_change_password) };
}

export async function changeOwnPassword(user: SessionUser, current: string, next: string) {
  const sql = await db();
  const [row] = await sql`select * from users where id = ${user.id}`;
  if (!row || !(await verifyPassword(current, row.password_hash))) return "Your current password isn't right.";
  const problem = passwordProblem(next);
  if (problem) return problem;
  if (current === next) return "Choose a password different from the current one.";
  const [updated] = await sql`
    update users set password_hash = ${await hashPassword(next)}, must_change_password = false,
      session_version = session_version + 1
    where id = ${user.id} returning session_version`;
  await startSession(user.id, updated.session_version);
  return "";
}
