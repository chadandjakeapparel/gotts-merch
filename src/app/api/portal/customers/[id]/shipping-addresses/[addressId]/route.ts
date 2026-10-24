import { deleteShippingAddress, updateShippingAddress } from "@/lib/portal/customers";
import { handle, int, readJson } from "@/lib/portal/http";
import { toAddressInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string; addressId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, addressId } = await params;
    const body = await readJson(request);
    await updateShippingAddress(int(id), int(addressId), toAddressInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, addressId } = await params;
    await deleteShippingAddress(int(id), int(addressId));
    return {};
  });
}
