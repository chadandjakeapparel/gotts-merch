import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { QuoteSectionApp } from "@/components/portal/quote-section-app";
import { getQuoteSection } from "@/lib/portal/quote-section";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function QuoteSectionPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "quote"))) {
    return (
      <div className="portal">
        <PortalHeader current="quote" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="the Quote Page Editor" />
        </main>
      </div>
    );
  }
  const quoteSection = await getQuoteSection();
  return (
    <div className="portal">
      <PortalHeader current="quote" viewer={await toViewer(user)} />
      <main className="portal-main">
        <QuoteSectionApp initial={quoteSection} />
      </main>
    </div>
  );
}
