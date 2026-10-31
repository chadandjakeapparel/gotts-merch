import { deleteUser, renameUser, requireUserInClient, resetUserPassword } from "@/lib/portal/accounts";
import { getCustomer } from "@/lib/portal/customers";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; userId: string }> };

async function requireScopedUser(customerId: number, userId: number) {
  const customer = await getCustomer(customerId);
  if (!customer?.clientId) throw new PortalError("That customer doesn't have any logins yet.", 404);
  await requireUserInClient(userId, customer.clientId);
}

/**
 * `{ action: "reset" }` sets a new temporary password and returns it.
 * `{ action: "rename", name }` changes the login's display name.
 */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const { id, userId } = await params;
    await requireScopedUser(int(id), int(userId));
    const body = await readJson(request);
    if (body.action === "reset") return await resetUserPassword(int(userId));
    if (body.action === "rename") {
      await renameUser(int(userId), text(body.name, 120));
      return {};
    }
    throw new PortalError("Unknown action.");
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async ({ user }) => {
    const { id, userId } = await params;
    await requireScopedUser(int(id), int(userId));
    await deleteUser(int(userId), user.id);
    return {};
  });
}
