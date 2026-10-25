import { deleteJob, parseJobStatus, setJobStatus, updateJob } from "@/lib/portal/jobs";
import { handle, int, readJson } from "@/lib/portal/http";
import { toJobInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

/** Saves the job's fields and, if `status` is included, moves it to that stage. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updateJob(id, toJobInput(body));
    if (body.status != null) await setJobStatus(id, parseJobStatus(body.status));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteJob(int((await params).id));
    return {};
  });
}
