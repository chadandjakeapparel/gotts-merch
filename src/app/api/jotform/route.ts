import { NextResponse } from "next/server";
import { clientIdForWebhookKey } from "@/lib/portal/accounts";
import { createOrder, findItemsForMatching } from "@/lib/portal/data";
import { parseSubmission } from "@/lib/portal/jotform";

/**
 * JotForm webhook. Each client has its own link, shown on the portal's Clients
 * page: https://<your-site>/api/jotform?key=<client webhook key>. In JotForm
 * add it under Settings → Integrations → WebHooks.
 */
export async function POST(request: Request) {
  const key = new URL(request.url).searchParams.get("key") || "";
  let clientId: number | null;
  try {
    clientId = await clientIdForWebhookKey(key);
  } catch (error) {
    console.error("[jotform]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!clientId) return NextResponse.json({ ok: false }, { status: 401 });

  let fields: Record<string, unknown> = {};
  try {
    const type = request.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      fields = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Unreadable submission" }, { status: 400 });
  }

  let raw: Record<string, unknown> = {};
  if (typeof fields.rawRequest === "string") {
    try {
      raw = JSON.parse(fields.rawRequest) as Record<string, unknown>;
    } catch {}
  } else if (fields.rawRequest && typeof fields.rawRequest === "object") {
    raw = fields.rawRequest as Record<string, unknown>;
  }
  if (!Object.keys(raw).length) raw = fields;

  const submissionId = String(fields.submissionID || fields.submission_id || raw.submission_id || "");
  try {
    const input = parseSubmission(raw, await findItemsForMatching(clientId));
    if (!input.ref && submissionId) input.ref = `JF-${submissionId.slice(-6)}`;
    const result = await createOrder(clientId, input, {
      source: "jotform",
      externalId: submissionId ? `jotform:${submissionId}` : undefined,
      raw: { formID: fields.formID, formTitle: fields.formTitle, pretty: fields.pretty, rawRequest: raw },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[jotform]", error);
    // A 500 lets JotForm retry the delivery.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
