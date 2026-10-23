import { deleteUser, resetUserPassword } from "@/lib/portal/accounts";
import { handle, int, PortalError, readJson } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** `{ action: "reset" }` sets a new temporary password and returns it. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    if (body.action !== "reset") throw new PortalError("Unknown action.");
    return await resetUserPassword(int((await params).id));
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    await deleteUser(int((await params).id), user.id);
    return {};
  });
}
