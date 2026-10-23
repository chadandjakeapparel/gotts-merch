import { changeOwnPassword } from "@/lib/portal/auth";
import { handle, PortalError, readJson } from "@/lib/portal/http";

export async function POST(request: Request) {
  return handle(request, {}, async ({ user }) => {
    const body = await readJson(request);
    const current = typeof body.current === "string" ? body.current : "";
    const next = typeof body.next === "string" ? body.next : "";
    const problem = await changeOwnPassword(user, current, next);
    if (problem) throw new PortalError(problem);
    return {};
  });
}
