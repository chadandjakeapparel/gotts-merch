import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { deleteDesignProduct, updateDesignProduct, type DesignProductInput } from "@/lib/design-products";
import { PortalError } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

async function isAuthorized(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

function readInput(body: Record<string, unknown>): DesignProductInput {
  const area = (body.printArea && typeof body.printArea === "object" ? body.printArea : {}) as Record<string, unknown>;
  return {
    label: typeof body.label === "string" ? body.label.trim().slice(0, 120) : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 500) : "",
    placeholder: body.placeholder === "black-tee" || body.placeholder === "white-hoodie" || body.placeholder === "grey-crewneck" ? body.placeholder : null,
    printArea: {
      left: Number(area.left) || 0,
      top: Number(area.top) || 0,
      width: Number(area.width) || 0,
      height: Number(area.height) || 0,
    },
    active: Boolean(body.active),
  };
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAuthorized())) return NextResponse.json({ ok: false }, { status: 401 });
  const id = Number((await params).id);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    await updateDesignProduct(id, readInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Couldn't save that product." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!(await isAuthorized())) return NextResponse.json({ ok: false }, { status: 401 });
  const id = Number((await params).id);
  await deleteDesignProduct(id);
  return NextResponse.json({ ok: true });
}
