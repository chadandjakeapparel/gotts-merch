import type { StaffRole } from "@/lib/portal/auth";
import { createUser, listUsers } from "@/lib/portal/accounts";
import { handle, int, readJson, text } from "@/lib/portal/http";

const STAFF_ROLES: StaffRole[] = ["admin", "sales_rep", "finance"];

export async function GET(request: Request) {
  return handle(request, { adminOnly: true }, async () => ({ users: await listUsers() }));
}

/** Creates a login and returns its temporary password, shown once. */
export async function POST(request: Request) {
  return handle(request, { adminOnly: true }, async () => {
    const body = await readJson(request);
    const role = body.role === "staff" ? "staff" : "client";
    const staffRole = STAFF_ROLES.includes(body.staffRole as StaffRole) ? (body.staffRole as StaffRole) : "admin";
    const clientId = int(body.clientId);
    return await createUser({
      email: text(body.email, 200),
      name: text(body.name, 120),
      role,
      staffRole,
      clientId: Number.isFinite(clientId) ? clientId : null,
    });
  });
}
