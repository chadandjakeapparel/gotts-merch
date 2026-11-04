import { deleteVendor, updateVendor } from "@/lib/portal/vendors";
import { handle, int, readJson } from "@/lib/portal/http";
import { toVendorInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updateVendor(id, toVendorInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteVendor(int((await params).id));
    return {};
  });
}
