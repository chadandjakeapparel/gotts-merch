import { createVendor, listVendors } from "@/lib/portal/vendors";
import { handle, readJson } from "@/lib/portal/http";
import { toVendorInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => {
    const vendors = await listVendors();
    return { vendors };
  });
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await createVendor(toVendorInput(body));
    return { id };
  });
}
