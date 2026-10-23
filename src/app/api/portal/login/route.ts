import { NextResponse } from "next/server";
import { login } from "@/lib/portal/auth";

export async function POST(request: Request) {
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
      // Slow down repeated guessing.
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ ok: false, error: "That email and password don't match." }, { status: 401 });
    }
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
