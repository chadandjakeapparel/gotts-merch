import { createClient, listClients } from "@/lib/portal/accounts";
import { handle, readJson, text } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ clients: await listClients() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    return { id: await createClient(text(body.name, 120)) };
  });
}
