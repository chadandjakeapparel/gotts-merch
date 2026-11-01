import { approveEstimate } from "@/lib/portal/estimates";
import { handle } from "@/lib/portal/http";

export async function POST(request: Request) {
  return handle(request, { client: true }, async ({ user, clientId }) => approveEstimate(clientId, user.name || user.email));
}
