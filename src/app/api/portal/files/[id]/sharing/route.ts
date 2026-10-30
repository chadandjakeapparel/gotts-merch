import { setFolderSharing } from "@/lib/portal/files";
import { handle, int, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await setFolderSharing(int((await params).id), {
      shareExternally: Boolean(body.shareExternally),
      password: text(body.password, 200),
      shareToken: text(body.shareToken, 60),
      shareTitle: text(body.shareTitle, 200),
    });
    return {};
  });
}
