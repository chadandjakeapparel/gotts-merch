import { createFolder, listFolders } from "@/lib/portal/files";
import { handle, readJson, text } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ folders: await listFolders() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async ({ user }) => {
    const body = await readJson(request);
    const id = await createFolder(text(body.name, 200), user.name || user.email);
    return { id };
  });
}
