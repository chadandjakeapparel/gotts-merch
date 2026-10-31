import { linkCustomerClient } from "@/lib/portal/customers";
import { handle, int, PortalError, readJson } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** Maps an existing, not-yet-linked client (and its logins) onto this customer. */
export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const clientId = int(body.clientId);
    if (!Number.isInteger(clientId)) throw new PortalError("Choose a client to link.");
    await linkCustomerClient(int((await params).id), clientId);
    return {};
  });
}
