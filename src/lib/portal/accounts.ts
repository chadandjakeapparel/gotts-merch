import { randomBytes } from "node:crypto";
import { hashPassword, temporaryPassword, type Role } from "./auth";
import { db } from "./db";
import { PortalError } from "./http";
import type { ClientSummary, PortalUser } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const newWebhookKey = () => randomBytes(18).toString("base64url");

function toUser(r: Row): PortalUser {
  return {
    id: Number(r.id),
    email: String(r.email),
    name: String(r.name),
    role: r.role as PortalUser["role"],
    clientId: r.client_id == null ? null : Number(r.client_id),
    mustChangePassword: Boolean(r.must_change_password),
    isOwner: Boolean(r.is_owner),
    lastLoginAt: iso(r.last_login_at),
    createdAt: iso(r.created_at) || "",
  };
}

export async function listClients(): Promise<ClientSummary[]> {
  const sql = await db();
  const rows = await sql`
    select c.*,
      (select count(*)::int from items i where i.client_id = c.id) as item_count,
      (select coalesce(sum(qty), 0)::int from items i where i.client_id = c.id) as units,
      (select count(*)::int from orders o where o.client_id = c.id and o.status = 'open') as open_orders,
      (select count(*)::int from users u where u.client_id = c.id) as user_count
    from clients c
    order by lower(c.name)`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    webhookKey: r.webhook_key,
    itemCount: r.item_count,
    units: r.units,
    openOrders: r.open_orders,
    userCount: r.user_count,
  }));
}

export async function clientName(id: number) {
  const sql = await db();
  const [row] = await sql`select name from clients where id = ${id}`;
  return row ? String(row.name) : "";
}

export async function clientIdForWebhookKey(key: string) {
  if (!key) return null;
  const sql = await db();
  const [row] = await sql`select id from clients where webhook_key = ${key}`;
  return row ? Number(row.id) : null;
}

export async function createClient(name: string) {
  if (!name) throw new PortalError("Give the client a name.");
  const sql = await db();
  const [row] = await sql`insert into clients (name, webhook_key) values (${name}, ${newWebhookKey()}) returning id`;
  return Number(row.id);
}

export async function renameClient(id: number, name: string) {
  if (!name) throw new PortalError("Give the client a name.");
  const sql = await db();
  const rows = await sql`update clients set name = ${name} where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That client no longer exists.", 404);
}

/** Issues a new JotForm link; the old one stops working. */
export async function rotateWebhookKey(id: number) {
  const sql = await db();
  const rows = await sql`update clients set webhook_key = ${newWebhookKey()} where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That client no longer exists.", 404);
}

/**
 * Makes sure exactly one staff login is flagged as the protected owner,
 * preferring whichever account's email matches PORTAL_ADMIN_EMAIL (the one
 * used to bootstrap the first login) over a guess at "the oldest row" --
 * precise and safe to call on every load, since it no-ops once an owner
 * is already set.
 */
async function ensureOwner() {
  const sql = await db();
  const [{ has_owner }] = await sql`select exists(select 1 from users where is_owner) as has_owner`;
  if (has_owner) return;
  const adminEmail = process.env.PORTAL_ADMIN_EMAIL?.trim().toLowerCase();
  const byEmail = adminEmail ? await sql`select id from users where role = 'staff' and lower(email) = ${adminEmail}` : [];
  const [target] = byEmail.length ? byEmail : await sql`select id from users where role = 'staff' order by created_at asc limit 1`;
  if (target) await sql`update users set is_owner = true where id = ${target.id}`;
}

export async function listUsers(): Promise<PortalUser[]> {
  const sql = await db();
  await ensureOwner();
  const rows = await sql`select * from users order by is_owner desc, role desc, lower(email)`;
  return rows.map(toUser);
}

/** A customer's own logins, for the Credentials panel on their customer page. */
export async function listUsersByClient(clientId: number): Promise<PortalUser[]> {
  const sql = await db();
  const rows = await sql`select * from users where client_id = ${clientId} order by lower(email)`;
  return rows.map(toUser);
}

/** Guards the customer-scoped credential routes against acting on a login that belongs to a different client. */
export async function requireUserInClient(userId: number, clientId: number) {
  const sql = await db();
  const [row] = await sql`select client_id from users where id = ${userId}`;
  if (!row || Number(row.client_id) !== clientId) throw new PortalError("That login doesn't belong to this customer.", 404);
}

export async function createUser(input: { email: string; name: string; role: Role; clientId: number | null }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PortalError("Enter a valid email address.");
  if (input.role === "client" && !input.clientId) throw new PortalError("Choose which client this login belongs to.");
  const password = temporaryPassword();
  const sql = await db();
  try {
    await sql`
      insert into users (email, name, password_hash, role, client_id, must_change_password)
      values (${email}, ${input.name}, ${await hashPassword(password)}, ${input.role},
        ${input.role === "client" ? input.clientId : null}, true)`;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new PortalError(`${email} already has a login.`, 409);
    if ((error as { code?: string }).code === "23503") throw new PortalError("That client no longer exists.", 404);
    throw error;
  }
  return { email, password };
}

export async function renameUser(id: number, name: string) {
  if (!name.trim()) throw new PortalError("Give this login a name.");
  const sql = await db();
  const rows = await sql`update users set name = ${name.trim()} where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That login no longer exists.", 404);
}

/** Sets a new temporary password and signs the person out everywhere. */
export async function resetUserPassword(id: number) {
  const password = temporaryPassword();
  const sql = await db();
  const [row] = await sql`
    update users set password_hash = ${await hashPassword(password)}, must_change_password = true,
      session_version = session_version + 1
    where id = ${id} returning email`;
  if (!row) throw new PortalError("That login no longer exists.", 404);
  return { email: String(row.email), password };
}

export async function deleteUser(id: number, actingUserId: number) {
  if (id === actingUserId) throw new PortalError("You can't remove your own login.");
  await ensureOwner();
  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx`select role, is_owner from users where id = ${id} for update`;
    if (!row) return;
    if (row.is_owner) throw new PortalError("The account owner can't be removed.");
    if (row.role === "staff") {
      const [{ n }] = await tx`select count(*)::int as n from users where role = 'staff'`;
      if (n <= 1) throw new PortalError("Keep at least one staff login.");
    }
    await tx`delete from users where id = ${id}`;
  });
}
