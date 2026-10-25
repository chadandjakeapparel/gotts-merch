import { parseJobStatus, setJobStatus } from "@/lib/portal/jobs";
import { handle, int, readJson } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** Moves a job to a stage without needing its other fields -- used by the board's drag and drop. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await setJobStatus(id, parseJobStatus(body.status));
    return {};
  });
}
