import { deleteLead, parseStatus, setLeadStatus, updateLead } from "@/lib/portal/crm";
import { handle, int, readJson, text } from "@/lib/portal/http";
import { toLeadInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

/** Saves the lead's fields and, if `status` is included, moves it to that stage. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updateLead(id, toLeadInput(body));
    let clientId: number | null = null;
    if (body.status != null) {
      const result = await setLeadStatus(id, parseStatus(body.status), user.name || user.email, {
        lostReason: text(body.lostReason, 300),
      });
      clientId = result.clientId;
    }
    return { clientId };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteLead(int((await params).id));
    return {};
  });
}
