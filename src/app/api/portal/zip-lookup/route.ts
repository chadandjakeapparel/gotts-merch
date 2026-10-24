import { handle, PortalError } from "@/lib/portal/http";

type ZippopotamResponse = {
  "post code": string;
  places: { "place name": string; state: string; "state abbreviation": string }[];
};

/**
 * Looks up a US ZIP code's city and state for the address autofill, via the
 * free Zippopotam.us lookup (no API key). Best-effort: a miss or an
 * unreachable upstream just means the person types the city/state in
 * themselves, so this never needs to be treated as a hard dependency.
 */
export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => {
    const zip = (new URL(request.url).searchParams.get("zip") || "").trim();
    if (!/^\d{5}$/.test(zip)) throw new PortalError("Enter a 5-digit ZIP code.");
    let response: Response;
    try {
      response = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(4000) });
    } catch {
      throw new PortalError("Couldn't reach the ZIP code lookup. Enter the city and state yourself.", 502);
    }
    if (response.status === 404) throw new PortalError("That ZIP code wasn't found.", 404);
    if (!response.ok) throw new PortalError("Couldn't reach the ZIP code lookup. Enter the city and state yourself.", 502);
    const data = (await response.json()) as ZippopotamResponse;
    const place = data.places?.[0];
    if (!place) throw new PortalError("That ZIP code wasn't found.", 404);
    return { city: place["place name"] || "", state: place["state abbreviation"] || place.state || "" };
  });
}
