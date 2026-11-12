import type { StaffRole } from "@/lib/portal/auth";
import { deleteUser, renameUser, resetUserPassword, setUserStaffRole } from "@/lib/portal/accounts";
import { handle, int, PortalError, readJson, text } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

const STAFF_ROLES: StaffRole[] = ["admin", "sales_rep", "finance"];

/**
 * `{ action: "reset" }` sets a new temporary password and returns it.
 * `{ action: "rename", name }` changes the login's display name.
 * `{ action: "set-role", staffRole }` changes a staff login's role.
 */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { adminOnly: true }, async () => {
    const body = await readJson(request);
    const id = int((await params).id);
    if (body.action === "reset") return await resetUserPassword(id);
    if (body.action === "rename") {
      await renameUser(id, text(body.name, 120));
      return {};
    }
    if (body.action === "set-role") {
      if (!STAFF_ROLES.includes(body.staffRole as StaffRole)) throw new PortalError("Choose a role.");
      await setUserStaffRole(id, body.staffRole as StaffRole);
      return {};
    }
    throw new PortalError("Unknown action.");
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { adminOnly: true }, async ({ user }) => {
    await deleteUser(int((await params).id), user.id);
    return {};
  });
}
