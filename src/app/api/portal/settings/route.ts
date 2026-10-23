import { setLowStockThreshold } from "@/lib/portal/data";
import { handle, int, readJson } from "@/lib/portal/http";

/** `{ lowStockThreshold }` sets when a style is flagged as low stock. */
export async function PATCH(request: Request) {
  return handle(request, { client: true }, async ({ clientId }) => {
    const body = await readJson(request);
    await setLowStockThreshold(clientId, int(body.lowStockThreshold));
    return {};
  });
}
