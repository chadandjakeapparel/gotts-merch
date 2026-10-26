import { put } from "@vercel/blob";
import { MAX_ART_BYTES } from "@/lib/design-constants";
import { handle, PortalError } from "@/lib/portal/http";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new PortalError("No file provided");

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) throw new PortalError("Use a JPG, PNG, or WEBP image", 422);
    if (file.size > MAX_ART_BYTES) throw new PortalError("Image is too large (max 5MB)", 422);

    const blob = await put(`designer/${Date.now()}.${extension}`, file, {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url };
  });
}
