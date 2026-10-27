import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const ALLOWED_FOLDERS = new Set(["team", "brand", "favicon", "og", "category", "golf-gallery"]);

export async function POST(request: Request) {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Use a JPG, PNG, or WEBP image" },
      { status: 422 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image is too large (max 5MB)" },
      { status: 422 },
    );
  }

  const requestedFolder = formData.get("folder");
  const folder =
    typeof requestedFolder === "string" && ALLOWED_FOLDERS.has(requestedFolder)
      ? requestedFolder
      : "team";

  const blob = await put(`${folder}/${Date.now()}.${extension}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
