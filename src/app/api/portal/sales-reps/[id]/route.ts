import { deleteSalesRep, renameSalesRep } from "@/lib/portal/customers";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await renameSalesRep(int((await params).id), text(body.name, 120));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteSalesRep(int((await params).id));
    return {};
  });
}
