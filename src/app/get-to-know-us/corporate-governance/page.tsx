import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `Corporate Governance | ${content.brandName}` };
}

export default async function CorporateGovernancePage() {
  const content = await getSiteContent();

  return (
    <DocPage title="Corporate Governance" updated="October 25, 2026">
      <p>
        {content.brandName} is a privately held company. We&apos;re in the process of publishing more detail
        about our company structure and policies here -- check back soon.
      </p>
      <h2>Contact us</h2>
      <p>If you need governance information sooner, email us at {content.inquiryEmail}.</p>
    </DocPage>
  );
}
