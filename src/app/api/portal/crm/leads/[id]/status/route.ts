import { parseStatus, setLeadStatus } from "@/lib/portal/crm";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** Moves a lead to a stage without needing its other fields -- used by the board's drag and drop. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    const result = await setLeadStatus(id, parseStatus(body.status), user.name || user.email, {
      lostReason: text(body.lostReason, 300),
    });
    return { clientId: result.clientId };
  });
}
