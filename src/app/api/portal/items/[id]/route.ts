import { deleteItem, updateItem } from "@/lib/portal/data";
import { handle, int, readJson } from "@/lib/portal/http";
import { toItemInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    await updateItem(clientId, int((await params).id), toItemInput(await readJson(request)));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    await deleteItem(clientId, int((await params).id));
    return {};
  });
}
