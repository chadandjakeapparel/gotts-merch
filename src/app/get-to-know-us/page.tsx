import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

const DOCS = [
  { href: "/get-to-know-us/privacy-policy", title: "Privacy Policy", description: "What information we collect and how we use it." },
  { href: "/get-to-know-us/terms-of-service", title: "Terms of Service", description: "The terms that govern using our website and services." },
  { href: "/get-to-know-us/user-agreement", title: "User Agreement", description: "The terms that govern logging in to the client portal." },
  { href: "/get-to-know-us/ai-supplemental-terms", title: "AI Supplemental Terms", description: "Additional terms covering AI-assisted features." },
  { href: "/get-to-know-us/corporate-governance", title: "Corporate Governance", description: "How our company is organized and run." },
  { href: "/get-to-know-us/press", title: "Press", description: "Company facts and media contact information." },
];

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Get to Know Us | ${content.brandName}`,
    description: "Our policies, agreements and company information.",
  };
}

export default async function GetToKnowUsPage() {
  const content = await getSiteContent();

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <div className="gm-section-heading">
          <p className="gm-eyebrow">Get to Know Us</p>
          <h1>Policies &amp; company information</h1>
          <p className="gm-brands__lead">
            Everything about how {content.brandName} operates, protects your information and works with you --
            in one place.
          </p>
        </div>
        <div className="gm-doc-grid">
          {DOCS.map((doc) => (
            <Link className="gm-doc-card" href={doc.href} key={doc.href}>
              <h2>{doc.title}</h2>
              <p>{doc.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
