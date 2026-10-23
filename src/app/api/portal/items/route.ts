import { createItem, importItems } from "@/lib/portal/data";
import { handle, PortalError, readJson } from "@/lib/portal/http";
import { toItemInput } from "@/lib/portal/inputs";

/** Adds one line, or upserts many when the body carries `rows`. */
export async function POST(request: Request) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const body = await readJson(request);
    if (Array.isArray(body.rows)) {
      const rows = body.rows.map((r, i) => {
        if (!r || typeof r !== "object") throw new PortalError(`Row ${i + 1} could not be read.`);
        return toItemInput(r as Record<string, unknown>);
      });
      return await importItems(clientId, rows);
    }
    await createItem(clientId, toItemInput(body));
    return {};
  });
}
