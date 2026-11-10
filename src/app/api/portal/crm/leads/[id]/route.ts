import { addActivity, deleteLead, parseStatus, setLeadStatus, updateLead } from "@/lib/portal/crm";
import { convertLeadToJob } from "@/lib/portal/estimates";
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
    let jobId: number | null = null;
    if (body.status != null) {
      const createdBy = user.name || user.email;
      const status = parseStatus(body.status);
      const result = await setLeadStatus(id, status, createdBy, { lostReason: text(body.lostReason, 300) });
      clientId = result.clientId;
      if (result.changed && status === "won") {
        const converted = await convertLeadToJob(id, createdBy);
        jobId = converted.jobId;
        if (converted.created) await addActivity(id, "status", "Job board job created", createdBy);
      }
    }
    return { clientId, jobId };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteLead(int((await params).id));
    return {};
  });
}
