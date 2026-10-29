import { addJobActivity } from "@/lib/portal/jobs";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const id = int((await params).id);
    const body = await readJson(request);
    await addJobActivity(id, text(body.body, 2000), user.name || user.email);
    return {};
  });
}
