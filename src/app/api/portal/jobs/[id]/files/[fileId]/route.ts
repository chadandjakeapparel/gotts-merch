import { deleteJobFile } from "@/lib/portal/jobs";
import { handle, int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const { id, fileId } = await params;
    await deleteJobFile(clientId, int(id), int(fileId));
    return {};
  });
}
