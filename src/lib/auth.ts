import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "gm_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(expiry: number): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(String(expiry)).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  return `${expiry}.${sign(expiry)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expiryStr, signature] = token.split(".");
  const expiry = Number(expiryStr);
  if (!expiry || !signature || Date.now() > expiry) return false;
  try {
    return safeEqual(signature, sign(expiry));
  } catch {
    return false;
  }
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}
