import { NextResponse } from "next/server";
import { createDesign } from "@/lib/designs";
import { PortalError } from "@/lib/portal/http";

export async function POST(request: Request) {
  let body: { productId?: unknown; layers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const code = await createDesign(body.productId, body.layers);
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    if (error instanceof PortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Couldn't save your design. Try again." }, { status: 500 });
  }
}
