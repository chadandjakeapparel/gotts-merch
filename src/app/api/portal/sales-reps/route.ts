import { createSalesRep, listSalesReps } from "@/lib/portal/customers";
import { handle, readJson, text } from "@/lib/portal/http";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ salesReps: await listSalesReps() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await createSalesRep(text(body.name, 120));
    return { id };
  });
}
