import { createOrder } from "@/lib/portal/data";
import { handle, PortalError, readJson } from "@/lib/portal/http";
import { toOrderInput } from "@/lib/portal/inputs";

/** Creates an order by hand; `fulfillNow` also takes the stock out straight away. */
export async function POST(request: Request) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const body = await readJson(request);
    const input = toOrderInput(body);
    if (!input.lines.length) throw new PortalError("Add at least one style and quantity.");
    const { id } = await createOrder(clientId, input, { fulfillNow: body.fulfillNow === true });
    return { id };
  });
}
