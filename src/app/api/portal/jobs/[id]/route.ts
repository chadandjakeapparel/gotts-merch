import { deleteJob, updateJob } from "@/lib/portal/jobs";
import { handle, int, readJson } from "@/lib/portal/http";
import { toJobInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    await updateJob(clientId, int((await params).id), toJobInput(await readJson(request)));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    await deleteJob(clientId, int((await params).id));
    return {};
  });
}
