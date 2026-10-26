import { NextResponse } from "next/server";
import { createDesign } from "@/lib/designs";

export async function POST(request: Request) {
  let body: { product?: unknown; layers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const code = await createDesign(body.product, body.layers);
    return NextResponse.json({ ok: true, code });
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't save your design. Try again." }, { status: 500 });
  }
}
