import { getQuoteSection, updateQuoteSection, type QuoteSectionInput } from "@/lib/portal/quote-section";
import { handle, readJson } from "@/lib/portal/http";

function readInput(body: Record<string, unknown>): QuoteSectionInput {
  return {
    eyebrow: typeof body.eyebrow === "string" ? body.eyebrow : "",
    title: typeof body.title === "string" ? body.title : "",
    body: typeof body.body === "string" ? body.body : "",
    note: typeof body.note === "string" ? body.note : "",
    venueTypes: body.venueTypes,
    quantities: body.quantities,
    productOptions: body.productOptions,
  };
}

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ quoteSection: await getQuoteSection() }));
}

export async function PATCH(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await updateQuoteSection(readInput(body));
    return {};
  });
}
