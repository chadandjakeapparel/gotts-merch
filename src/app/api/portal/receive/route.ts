import { receiveStock } from "@/lib/portal/data";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

export async function POST(request: Request) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const body = await readJson(request);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    await receiveStock(clientId, {
      ref: text(body.ref, 120),
      note: text(body.note, 500),
      lines: lines.map((l) => {
        const line = (l || {}) as Record<string, unknown>;
        const itemId = int(line.itemId);
        if (!Number.isFinite(itemId)) throw new PortalError("Choose a style on every line.");
        return { itemId, qty: int(line.qty) };
      }),
    });
    return {};
  });
}
