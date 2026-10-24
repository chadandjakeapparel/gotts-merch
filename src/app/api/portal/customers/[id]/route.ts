import { deleteCustomer, updateCustomer } from "@/lib/portal/customers";
import { handle, int, readJson } from "@/lib/portal/http";
import { toCustomerInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await updateCustomer(int((await params).id), toCustomerInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteCustomer(int((await params).id));
    return {};
  });
}
