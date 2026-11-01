import { getBusinessInfo, updateBusinessInfo, type BusinessAddress, type BusinessInfoInput } from "@/lib/portal/business-info";
import { handle, readJson } from "@/lib/portal/http";

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readAddress(value: unknown): BusinessAddress {
  const a = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { line1: str(a.line1), line2: str(a.line2), city: str(a.city), state: str(a.state), zip: str(a.zip) };
}

function readInput(body: Record<string, unknown>): BusinessInfoInput {
  return {
    businessName: str(body.businessName),
    address: readAddress(body.address),
    email: str(body.email),
    phone: str(body.phone),
    ein: str(body.ein),
    remitAddress: readAddress(body.remitAddress),
  };
}

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ businessInfo: await getBusinessInfo() }));
}

export async function PATCH(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await updateBusinessInfo(readInput(body));
    return {};
  });
}
