import { AREAS, getRolePermissions, setRolePermission, type AreaKey } from "@/lib/portal/permissions";
import { handle, PortalError, readJson } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { adminOnly: true }, async () => ({ permissions: await getRolePermissions() }));
}

/** `{ staffRole: "sales_rep" | "finance", area, allowed }` toggles one cell of the matrix. */
export async function PATCH(request: Request) {
  return handle(request, { adminOnly: true }, async () => {
    const body = await readJson(request);
    const staffRole = body.staffRole;
    if (staffRole !== "sales_rep" && staffRole !== "finance") throw new PortalError("Choose a role.");
    const area = AREAS.find((a) => a.key === body.area)?.key as AreaKey | undefined;
    if (!area) throw new PortalError("Unknown area.");
    await setRolePermission(staffRole, area, body.allowed === true);
    return {};
  });
}
