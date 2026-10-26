import { NextResponse } from "next/server";
import { getDesignByCode, updateDesign } from "@/lib/designs";
import { PortalError } from "@/lib/portal/http";

type Params = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const design = await getDesignByCode(code);
  if (!design) return NextResponse.json({ ok: false, error: "That design link no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true, design });
}

export async function PATCH(request: Request, { params }: Params) {
  const { code } = await params;
  let body: { productId?: unknown; layers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    await updateDesign(code, body.productId, body.layers);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Couldn't save your design. Try again." }, { status: 500 });
  }
}
