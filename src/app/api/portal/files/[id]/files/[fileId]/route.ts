import { deleteFolderFile, renameFolderFile } from "@/lib/portal/files";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, fileId } = await params;
    const body = await readJson(request);
    await renameFolderFile(int(id), int(fileId), text(body.fileName, 300));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, fileId } = await params;
    await deleteFolderFile(int(id), int(fileId));
    return {};
  });
}
