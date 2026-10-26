import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { reorderDesignProducts } from "@/lib/design-products";

export async function POST(request: Request) {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id)) : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "Nothing to reorder" }, { status: 400 });
  await reorderDesignProducts(ids);
  return NextResponse.json({ ok: true });
}
