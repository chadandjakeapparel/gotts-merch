import { NextResponse } from "next/server";
import { login } from "@/lib/portal/auth";
import { clientIp, loginCooldown, recordLoginFailure, recordLoginSuccess } from "@/lib/portal/rate-limit";

export async function POST(request: Request) {
  const key = `portal:${clientIp(request)}`;
  const wait = await loginCooldown(key);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
    password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  } catch {}

  try {
    const result = email && password ? await login(email, password) : null;
    if (!result) {
      await recordLoginFailure(key);
      // Slow down repeated guessing.
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ ok: false, error: "That email and password don't match." }, { status: 401 });
    }
    await recordLoginSuccess(key);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[portal]", error);
    const setup = error instanceof Error && /DATABASE_URL|PORTAL_SESSION_SECRET/.test(error.message);
    return NextResponse.json(
      { ok: false, error: setup ? "The portal isn't fully set up yet. Check the database and session secret settings." : "Sign-in failed. Try again." },
      { status: setup ? 503 : 500 },
    );
  }
}
