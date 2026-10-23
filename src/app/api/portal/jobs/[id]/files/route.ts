import { addJobFile } from "@/lib/portal/jobs";
import { handle, int, PortalError } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };
const KINDS = new Set(["proof", "estimate", "other"]);

export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true, client: true }, async ({ clientId, user }) => {
    const id = int((await params).id);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new PortalError("No file provided.");
    const kindRaw = String(formData.get("kind") || "other");
    const kind = (KINDS.has(kindRaw) ? kindRaw : "other") as "proof" | "estimate" | "other";
    await addJobFile(clientId, id, kind, file, user.name || user.email);
    return {};
  });
}
