import { addActivity, parseStatus, setLeadStatus } from "@/lib/portal/crm";
import { convertLeadToJob } from "@/lib/portal/estimates";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** Moves a lead to a stage without needing its other fields -- used by the board's drag and drop. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    const createdBy = user.name || user.email;
    const status = parseStatus(body.status);
    const result = await setLeadStatus(id, status, createdBy, { lostReason: text(body.lostReason, 300) });

    let jobId: number | null = null;
    if (result.changed && status === "won") {
      const converted = await convertLeadToJob(id, createdBy);
      jobId = converted.jobId;
      if (converted.created) await addActivity(id, "status", "Job board job created", createdBy);
    }
    return { clientId: result.clientId, jobId };
  });
}
