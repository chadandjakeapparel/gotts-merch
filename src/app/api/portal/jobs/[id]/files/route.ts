import { put } from "@vercel/blob";
import { addJobFile } from "@/lib/portal/jobs";
import { handle, int, PortalError } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new PortalError("No file provided");

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      throw new PortalError("That file type isn't supported. Try an image, PDF, Office doc, CSV, or ZIP.", 422);
    }
    if (file.size > MAX_BYTES) throw new PortalError("File is too large (max 15MB)", 422);

    const blob = await put(`job-files/${id}/${Date.now()}.${extension}`, file, {
      access: "public",
      contentType: file.type,
    });

    const record = await addJobFile(
      id,
      { fileName: file.name, url: blob.url, contentType: file.type, size: file.size },
      user.name || user.email,
    );
    return { file: record };
  });
}
