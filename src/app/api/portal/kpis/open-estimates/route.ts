import { listOpenEstimates } from "@/lib/portal/estimates";
import { handle } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ estimates: await listOpenEstimates() }));
}
