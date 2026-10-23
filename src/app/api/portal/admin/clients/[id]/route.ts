import { renameClient, rotateWebhookKey } from "@/lib/portal/accounts";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** `{ name }` renames the client; `{ action: "rotate" }` issues a new JotForm link. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    if (body.action === "rotate") await rotateWebhookKey(id);
    else await renameClient(id, text(body.name, 120));
    return {};
  });
}
