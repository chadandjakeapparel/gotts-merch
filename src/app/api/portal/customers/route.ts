import { createCustomer, listCustomers } from "@/lib/portal/customers";
import { handle, readJson } from "@/lib/portal/http";
import { toCustomerInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ customers: await listCustomers() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await createCustomer(toCustomerInput(body));
    return { id };
  });
}
