import { requestEstimateChanges } from "@/lib/portal/estimates";
import { handle, readJson, text } from "@/lib/portal/http";

export async function POST(request: Request) {
  return handle(request, { client: true }, async ({ user, clientId }) => {
    const body = await readJson(request);
    await requestEstimateChanges(clientId, text(body.message, 2000), user.name || user.email);
    return {};
  });
}
