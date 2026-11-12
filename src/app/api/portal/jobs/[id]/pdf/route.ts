import { renderToBuffer } from "@react-pdf/renderer";
import { getSiteContent } from "@/lib/content";
import { getUser } from "@/lib/portal/auth";
import { getBusinessInfo } from "@/lib/portal/business-info";
import { getCustomer } from "@/lib/portal/customers";
import { int } from "@/lib/portal/http";
import { SalesOrderPdfDocument } from "@/lib/portal/job-pdf";
import { getJob } from "@/lib/portal/jobs";
import { can } from "@/lib/portal/permissions";

type Params = { params: Promise<{ id: string }> };

/** A printable PDF of a job's sales order, for staff to send outside the portal. */
export async function GET(request: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return new Response("Your session has ended. Sign in again.", { status: 401 });
  if (user.role !== "staff") return new Response("Your account can't export sales orders.", { status: 403 });
  if (!(await can(user, "jobs"))) return new Response("Your role doesn't have access to this area.", { status: 403 });

  const id = int((await params).id);
  const job = await getJob(id);
  if (!job) return new Response("That job no longer exists.", { status: 404 });
  if (!job.lineItems.length) return new Response("Add at least one line item before exporting.", { status: 400 });

  const [customer, business, site] = await Promise.all([
    job.customerId == null ? Promise.resolve(null) : getCustomer(job.customerId),
    getBusinessInfo(),
    getSiteContent(),
  ]);
  if (!customer) return new Response("This job has no customer to bill.", { status: 400 });

  const buffer = await renderToBuffer(SalesOrderPdfDocument({ job, customer, business, logoUrl: site.logoUrl }));
  const fileName = `SalesOrder-${job.salesOrderNumber || job.id}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
