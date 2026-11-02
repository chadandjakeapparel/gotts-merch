import { NextResponse } from "next/server";
import { PortalError } from "@/lib/portal/http";
import { addFolderFeedback } from "@/lib/portal/files";
import { clientIp, loginCooldown, recordLoginFailure } from "@/lib/portal/rate-limit";

type Params = { params: Promise<{ token: string }> };

/** Lets a shared folder's viewer leave feedback -- rate-limited per IP, same cooldown mechanism as the password gate. */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const key = `feedback:${token}:${clientIp(request)}`;
  const wait = await loginCooldown(key);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Too many messages sent. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  let name = "";
  let email = "";
  let message = "";
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown; message?: unknown };
    name = typeof body.name === "string" ? body.name.slice(0, 200) : "";
    email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
    message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
  } catch {}

  try {
    await addFolderFeedback(token, { name, email, message });
    await recordLoginFailure(key); // counts this submission toward the per-IP cap; never cleared, so it just throttles volume
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[portal]", error);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
