import { deleteJobPosting, updateJobPosting } from "@/lib/portal/job-postings";
import { handle, int, readJson } from "@/lib/portal/http";
import { toJobPostingInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updateJobPosting(id, toJobPostingInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteJobPosting(int((await params).id));
    return {};
  });
}
