import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.getToKnowUsTitle} | ${content.brandName}`,
    description: content.getToKnowUsLead.replaceAll("{{brandName}}", content.brandName),
    alternates: { canonical: "/get-to-know-us" },
  };
}

export default async function GetToKnowUsPage() {
  const content = await getSiteContent();
  const lead = content.getToKnowUsLead.replaceAll("{{brandName}}", content.brandName);

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <div className="gm-section-heading">
          <p className="gm-eyebrow">{content.getToKnowUsEyebrow}</p>
          <h1>{content.getToKnowUsTitle}</h1>
          <p className="gm-brands__lead">{lead}</p>
        </div>
        <div className="gm-doc-grid">
          {content.documents.map((doc) => (
            <Link className="gm-doc-card" href={`/get-to-know-us/${doc.slug}`} key={doc.slug}>
              <h2>{doc.title}</h2>
              <p>{doc.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
