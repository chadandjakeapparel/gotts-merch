import { createFolder, listFolders } from "@/lib/portal/files";
import { handle, int, readJson, text } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => {
    const parentParam = new URL(request.url).searchParams.get("parent");
    const parentId = parentParam ? int(parentParam) : null;
    return { folders: await listFolders(Number.isInteger(parentId) ? parentId : null) };
  });
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async ({ user }) => {
    const body = await readJson(request);
    const parentFolderId = body.parentFolderId == null || body.parentFolderId === "" ? null : int(body.parentFolderId);
    const id = await createFolder(
      text(body.name, 200),
      user.name || user.email,
      parentFolderId != null && Number.isInteger(parentFolderId) ? parentFolderId : null,
    );
    return { id };
  });
}
