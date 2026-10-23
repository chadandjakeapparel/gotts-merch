import { randomBytes } from "node:crypto";
import { hashPassword, temporaryPassword, type Role } from "./auth";
import { db } from "./db";
import { PortalError } from "./http";
import type { ClientSummary, PortalUser } from "./types";

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const newWebhookKey = () => randomBytes(18).toString("base64url");

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

export async function listUsers(): Promise<PortalUser[]> {
  const sql = await db();
  const rows = await sql`select * from users order by is_owner desc, role desc, lower(email)`;
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    clientId: r.client_id,
    mustChangePassword: r.must_change_password,
    isOwner: Boolean(r.is_owner),
    lastLoginAt: iso(r.last_login_at),
    createdAt: iso(r.created_at) || "",
  }));
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
