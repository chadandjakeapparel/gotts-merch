import { deleteFolderFile } from "@/lib/portal/files";
import { handle, int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, fileId } = await params;
    await deleteFolderFile(int(id), int(fileId));
    return {};
  });
}
