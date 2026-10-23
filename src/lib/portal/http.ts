import { NextResponse } from "next/server";
import { getUser, type SessionUser } from "./auth";
import { db } from "./db";

export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type Ctx = { user: SessionUser; clientId: number };

/**
 * The client a request acts on: a client user's own, or for staff the
 * `?client=` id they picked.
 */
export async function resolveClientId(user: SessionUser, requested: string | null | undefined) {
  if (user.role === "client") return user.clientId!;
  const id = Number(requested);
  if (!Number.isInteger(id) || id <= 0) throw new PortalError("Choose a client first.", 400);
  const sql = await db();
  const [row] = await sql`select id from clients where id = ${id}`;
  if (!row) throw new PortalError("That client no longer exists.", 404);
  return id;
}

/**
 * Runs a portal API handler for a signed-in user. `staff` limits it to staff;
 * `client` resolves which client's data the request is about.
 */
export async function handle(
  request: Request,
  need: { staff?: boolean; client?: boolean },
  run: (ctx: Ctx) => Promise<unknown>,
) {
  try {
    const user = await getUser();
    if (!user) throw new PortalError("Your session has ended. Sign in again.", 401);
    if (need.staff && user.role !== "staff") {
      throw new PortalError("Your account can view this information but cannot change it.", 403);
    }
    const clientId = need.client
      ? await resolveClientId(user, new URL(request.url).searchParams.get("client"))
      : user.clientId ?? 0;
    const result = await run({ user, clientId });
    return NextResponse.json({ ok: true, ...(result as object) });
  } catch (error) {
    if (error instanceof PortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[portal]", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong saving that change. Try again." },
      { status: 500 },
    );
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {}
  throw new PortalError("The request could not be read.");
}

export function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function int(value: unknown) {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export function money(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
