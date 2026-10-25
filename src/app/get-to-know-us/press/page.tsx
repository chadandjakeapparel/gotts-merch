import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `Press | ${content.brandName}` };
}

export default async function PressPage() {
  const content = await getSiteContent();

  return (
    <DocPage title="Press" updated="October 25, 2026">
      <p>{content.metaDescription}</p>
      <h2>Media inquiries</h2>
      <p>
        For interviews, logos, product photography or other press assets, email us at{" "}
        {content.inquiryEmail} and we&apos;ll get back to you.
      </p>
    </DocPage>
  );
}
