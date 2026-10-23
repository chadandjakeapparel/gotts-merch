import { getState } from "@/lib/portal/data";
import { handle } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { client: true }, async ({ clientId }) => ({ state: await getState(clientId) }));
}
