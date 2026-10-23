import { createUser, listUsers } from "@/lib/portal/accounts";
import { handle, int, readJson, text } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ users: await listUsers() }));
}

/** Creates a login and returns its temporary password, shown once. */
export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const role = body.role === "staff" ? "staff" : "client";
    const clientId = int(body.clientId);
    return await createUser({
      email: text(body.email, 200),
      name: text(body.name, 120),
      role,
      clientId: Number.isFinite(clientId) ? clientId : null,
    });
  });
}
