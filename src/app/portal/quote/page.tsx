import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { QuoteSectionApp } from "@/components/portal/quote-section-app";
import { getQuoteSection } from "@/lib/portal/quote-section";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function QuoteSectionPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  const quoteSection = await getQuoteSection();
  return (
    <div className="portal">
      <PortalHeader current="quote" viewer={toViewer(user)} />
      <main className="portal-main">
        <QuoteSectionApp initial={quoteSection} />
      </main>
    </div>
  );
}
