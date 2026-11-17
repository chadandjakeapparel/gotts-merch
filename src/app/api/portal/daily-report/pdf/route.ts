import { renderToBuffer } from "@react-pdf/renderer";
import { getSiteContent } from "@/lib/content";
import { getUser } from "@/lib/portal/auth";
import { getDailyReport } from "@/lib/portal/daily-report";
import { DailyReportPdfDocument } from "@/lib/portal/daily-report-pdf";
import { can } from "@/lib/portal/permissions";

/** A 1-page PDF of everything logged in the portal from local midnight through right now. */
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Your session has ended. Sign in again.", { status: 401 });
  if (user.role !== "staff") return new Response("Your account can't export this report.", { status: 403 });
  if (!(await can(user, "kpis"))) return new Response("Your role doesn't have access to this area.", { status: 403 });

  const [report, site] = await Promise.all([getDailyReport(), getSiteContent()]);
  const buffer = await renderToBuffer(DailyReportPdfDocument({ report, logoUrl: site.logoUrl }));
  const fileName = `DailyReport-${report.generatedAt.slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
