import { deleteUser, renameUser, resetUserPassword } from "@/lib/portal/accounts";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/**
 * `{ action: "reset" }` sets a new temporary password and returns it.
 * `{ action: "rename", name }` changes the login's display name.
 */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = int((await params).id);
    if (body.action === "reset") return await resetUserPassword(id);
    if (body.action === "rename") {
      await renameUser(id, text(body.name, 120));
      return {};
    }
    throw new PortalError("Unknown action.");
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    await deleteUser(int((await params).id), user.id);
    return {};
  });
}
