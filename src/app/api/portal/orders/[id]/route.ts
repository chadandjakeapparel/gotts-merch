import { cancelOrder, fulfillOrder, shipOrder, updateOrder } from "@/lib/portal/data";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";
import { toOrderInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

/** Order actions: `fulfill`, `ship` (carrier, tracking), `cancel`, or `edit` (order fields and lines). */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    switch (body.action) {
      case "fulfill":
        await fulfillOrder(clientId, id);
        break;
      case "ship":
        await shipOrder(clientId, id, text(body.carrier, 60), text(body.tracking, 120));
        break;
      case "cancel":
        await cancelOrder(clientId, id);
        break;
      case "edit":
        await updateOrder(clientId, id, toOrderInput(body));
        break;
      default:
        throw new PortalError("Unknown order action.");
    }
    return {};
  });
}
