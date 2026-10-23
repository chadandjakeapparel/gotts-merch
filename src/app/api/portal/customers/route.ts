import { importCustomers, listCustomers } from "@/lib/portal/customers";
import { handle, PortalError, readJson } from "@/lib/portal/http";
import { toCustomerInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ customers: await listCustomers() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    if (!Array.isArray(body.rows)) throw new PortalError("No rows to import.");
    const rows = body.rows.map((r, i) => {
      if (!r || typeof r !== "object") throw new PortalError(`Row ${i + 1} could not be read.`);
      return toCustomerInput(r as Record<string, unknown>);
    });
    return await importCustomers(rows);
  });
}
