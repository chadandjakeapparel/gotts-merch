import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { MAX_ART_BYTES } from "@/lib/design-constants";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Public, no-login upload for customer-supplied art on the Custom Designer. */
export async function POST(request: Request) {
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

  if (file.size > MAX_ART_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image is too large (max 5MB)" },
      { status: 422 },
    );
  }

  const blob = await put(
    `customer-art/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
    file,
    { access: "public", contentType: file.type },
  );

  return NextResponse.json({ ok: true, url: blob.url });
}
