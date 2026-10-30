import { deleteFolder, getFolder, getFolderPath, listFolders, renameFolder } from "@/lib/portal/files";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const folder = await getFolder(id);
    if (!folder) throw new PortalError("That folder no longer exists.", 404);
    const [subfolders, path] = await Promise.all([listFolders(id), getFolderPath(id)]);
    return { folder, subfolders, path };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await renameFolder(int((await params).id), text(body.name, 200));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteFolder(int((await params).id));
    return {};
  });
}
