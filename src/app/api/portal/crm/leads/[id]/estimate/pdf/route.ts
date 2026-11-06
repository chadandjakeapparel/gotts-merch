import { renderToBuffer } from "@react-pdf/renderer";
import { getSiteContent } from "@/lib/content";
import { getUser } from "@/lib/portal/auth";
import { getBusinessInfo } from "@/lib/portal/business-info";
import { getLead } from "@/lib/portal/crm";
import { EstimatePdfDocument } from "@/lib/portal/estimate-pdf";
import { estimateNumber, getEstimateForLead } from "@/lib/portal/estimates";
import { int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

/** A printable PDF of a lead's estimate, for staff to send outside the portal. */
export async function GET(request: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return new Response("Your session has ended. Sign in again.", { status: 401 });
  if (user.role !== "staff") return new Response("Your account can't export estimates.", { status: 403 });

  const id = int((await params).id);
  const [estimate, lead, business, site] = await Promise.all([
    getEstimateForLead(id),
    getLead(id),
    getBusinessInfo(),
    getSiteContent(),
  ]);
  if (!estimate || !lead) return new Response("That estimate no longer exists.", { status: 404 });
  if (!estimate.lineItems.length) return new Response("Add at least one line item before exporting.", { status: 400 });

  const buffer = await renderToBuffer(EstimatePdfDocument({ estimate, lead, business, logoUrl: site.logoUrl }));
  const fileName = `${estimateNumber(estimate.id)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
