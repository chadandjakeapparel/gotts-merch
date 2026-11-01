import { getEstimateForClient } from "@/lib/portal/estimates";
import { handle } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { client: true }, async ({ clientId }) => ({ estimate: await getEstimateForClient(clientId) }));
}
