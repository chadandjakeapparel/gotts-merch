import { unlockSharedFolder } from "@/lib/portal/files";
import { int } from "@/lib/portal/http";
import { clientIp, loginCooldown, recordLoginFailure, recordLoginSuccess } from "@/lib/portal/rate-limit";

type Params = { params: Promise<{ token: string; fileId: string }> };

/** A single shared file, proxied through our own origin and force-downloaded -- the blob's own URL is on another domain, so a plain link just opens it (an image, a PDF) instead of saving it. Same password + rate limit as unlocking the folder itself. */
export async function POST(request: Request, { params }: Params) {
  const { token, fileId } = await params;
  const key = `share:${token}:${clientIp(request)}`;
  const wait = await loginCooldown(key);
  if (wait > 0) {
    return Response.json(
      { ok: false, error: `Too many attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  } catch {}

  const folder = password ? await unlockSharedFolder(token, password) : null;
  if (!folder) {
    await recordLoginFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 700));
    return Response.json({ ok: false, error: "That password isn't right." }, { status: 401 });
  }
  await recordLoginSuccess(key);

  const file = folder.files.find((f) => f.id === int(fileId));
  if (!file) return Response.json({ ok: false, error: "That file no longer exists." }, { status: 404 });

  const response = await fetch(file.url);
  if (!response.ok || !response.body) {
    return Response.json({ ok: false, error: "Couldn't fetch that file. Try again." }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
    },
  });
}
