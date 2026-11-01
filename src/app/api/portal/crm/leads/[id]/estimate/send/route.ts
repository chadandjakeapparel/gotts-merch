import { sendEstimateForApproval } from "@/lib/portal/estimates";
import { handle, int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** Sends the lead's estimate to the customer for approval. */
export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    return sendEstimateForApproval(id, user.name || user.email);
  });
}
