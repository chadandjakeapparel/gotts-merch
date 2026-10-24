import { addShippingAddress, listShippingAddresses } from "@/lib/portal/customers";
import { handle, int, readJson } from "@/lib/portal/http";
import { toAddressInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => ({
    addresses: await listShippingAddresses(int((await params).id)),
  }));
}

export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await addShippingAddress(int((await params).id), toAddressInput(body));
    return { id };
  });
}
