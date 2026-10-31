import { createUser, listUsersByClient } from "@/lib/portal/accounts";
import { ensureCustomerClient, getCustomer } from "@/lib/portal/customers";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const customer = await getCustomer(int((await params).id));
    if (!customer) throw new PortalError("That customer no longer exists.", 404);
    if (customer.clientId == null) return { clientId: null, logins: [] };
    return { clientId: customer.clientId, logins: await listUsersByClient(customer.clientId) };
  });
}

/** Creates a portal login for this customer, linking it to a client (creating one) if it doesn't have one yet. */
export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    const clientId = await ensureCustomerClient(id);
    const result = await createUser({
      email: text(body.email, 200),
      name: text(body.name, 120),
      role: "client",
      clientId,
    });
    return { clientId, ...result };
  });
}
