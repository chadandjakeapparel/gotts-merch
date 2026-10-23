import { createLead, listLeads } from "@/lib/portal/crm";
import { handle, readJson } from "@/lib/portal/http";
import { toLeadInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ leads: await listLeads() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async ({ user }) => {
    const body = await readJson(request);
    const id = await createLead(toLeadInput(body), user.name || user.email);
    return { id };
  });
}
