import { makeShippingAddressPrimary } from "@/lib/portal/customers";
import { handle, int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; addressId: string }> };

/** Makes this the customer's primary shipping address, demoting whichever one was. */
export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, addressId } = await params;
    await makeShippingAddressPrimary(int(id), int(addressId));
    return {};
  });
}
