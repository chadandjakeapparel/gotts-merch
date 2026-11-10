import { zipSync } from "fflate";
import { unlockSharedFolder } from "@/lib/portal/files";
import { clientIp, loginCooldown, recordLoginFailure, recordLoginSuccess } from "@/lib/portal/rate-limit";

type Params = { params: Promise<{ token: string }> };

/** Every file in a shared folder, zipped up server-side -- the files are public blobs on another domain, so a plain link can't bundle them or force a save-as. Same password + rate limit as unlocking the folder itself. */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
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

  if (!folder.files.length) {
    return Response.json({ ok: false, error: "There's nothing to download yet." }, { status: 400 });
  }

  const entries: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();
  for (const file of folder.files) {
    const response = await fetch(file.url);
    if (!response.ok) continue;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const original = file.fileName || `file-${file.id}`;
    let name = original;
    let suffix = 2;
    while (usedNames.has(name)) {
      const dot = original.lastIndexOf(".");
      name = dot > 0 ? `${original.slice(0, dot)} (${suffix})${original.slice(dot)}` : `${original} (${suffix})`;
      suffix++;
    }
    usedNames.add(name);
    entries[name] = bytes;
  }

  const zipped = zipSync(entries);
  const zipName = (folder.shareTitle || folder.name || "files").replace(/[^a-z0-9 _-]+/gi, "").trim() || "files";

  return new Response(zipped, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}.zip"`,
    },
  });
}
