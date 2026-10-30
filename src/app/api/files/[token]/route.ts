import { NextResponse } from "next/server";
import { unlockSharedFolder } from "@/lib/portal/files";
import { clientIp, loginCooldown, recordLoginFailure, recordLoginSuccess } from "@/lib/portal/rate-limit";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const key = `share:${token}:${clientIp(request)}`;
  const wait = await loginCooldown(key);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  } catch {}

  try {
    const folder = password ? await unlockSharedFolder(token, password) : null;
    if (!folder) {
      await recordLoginFailure(key);
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ ok: false, error: "That password isn't right." }, { status: 401 });
    }
    await recordLoginSuccess(key);
    return NextResponse.json({
      ok: true,
      folder: { name: folder.name, title: folder.shareTitle || folder.name, files: folder.files },
    });
  } catch (error) {
    console.error("[portal]", error);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
