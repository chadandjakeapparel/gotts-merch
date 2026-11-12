import { updateCustomerNotes } from "@/lib/portal/customers";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "customers" }, async () => {
    const body = await readJson(request);
    await updateCustomerNotes(int((await params).id), text(body.notes, 10000));
    return {};
  });
}
