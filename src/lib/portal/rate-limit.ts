import { db } from "./db";

/**
 * Per-IP login throttling, shared by the client portal and the site content
 * admin. Keyed by IP rather than account/email so a guesser can't use it to
 * lock a real account out of their own login — worst case for a shared IP
 * (an office NAT) is a temporary cooldown, not a lockout.
 *
 * Fails open: if the database is unreachable, logins proceed unthrottled
 * rather than locking everyone out over an unrelated outage.
 */

const MAX_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;
const RESET_AFTER_MINUTES = 30;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** Minutes left on a lockout for this key, or 0 if the attempt may proceed. */
export async function loginCooldown(key: string): Promise<number> {
  try {
    const sql = await db();
    const [row] = await sql`select locked_until from login_lockouts where id = ${key}`;
    if (!row?.locked_until) return 0;
    const ms = new Date(row.locked_until).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 60_000) : 0;
  } catch (error) {
    console.error("[rate-limit]", error);
    return 0;
  }
}

export async function recordLoginFailure(key: string) {
  try {
    const sql = await db();
    await sql.begin(async (tx) => {
      const [row] = await tx`select failed_attempts, updated_at from login_lockouts where id = ${key} for update`;
      const stale = row && new Date(row.updated_at).getTime() < Date.now() - RESET_AFTER_MINUTES * 60_000;
      const attempts = row && !stale ? Number(row.failed_attempts) + 1 : 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
      await tx`
        insert into login_lockouts (id, failed_attempts, locked_until, updated_at)
        values (${key}, ${attempts}, ${lockedUntil}, now())
        on conflict (id) do update set failed_attempts = ${attempts}, locked_until = ${lockedUntil}, updated_at = now()`;
    });
  } catch (error) {
    console.error("[rate-limit]", error);
  }
}

export async function recordLoginSuccess(key: string) {
  try {
    const sql = await db();
    await sql`delete from login_lockouts where id = ${key}`;
  } catch (error) {
    console.error("[rate-limit]", error);
  }
}
