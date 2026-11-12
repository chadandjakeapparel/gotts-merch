import { getEstimateForLead, saveEstimateDraft } from "@/lib/portal/estimates";
import { handle, int, readJson } from "@/lib/portal/http";
import { toEstimateInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "crm" }, async () => {
    const estimate = await getEstimateForLead(int((await params).id));
    return { estimate };
  });
}

export async function PUT(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "crm" }, async ({ user }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    const estimateId = await saveEstimateDraft(id, toEstimateInput(body), user.name || user.email);
    return { estimateId };
  });
}
