import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { clientIp, loginCooldown, recordLoginFailure, recordLoginSuccess } from "@/lib/portal/rate-limit";

export async function POST(request: Request) {
  const key = `admin:${clientIp(request)}`;
  const wait = await loginCooldown(key);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof body.password !== "string" || !verifyPassword(body.password)) {
    await recordLoginFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await recordLoginSuccess(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
