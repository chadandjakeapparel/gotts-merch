import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocBody } from "@/components/doc-body";
import { getSiteContent } from "@/lib/content";
import { getLiveJobPosting } from "@/lib/portal/job-postings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadJob(idParam: string) {
  const content = await getSiteContent();
  const id = Number(idParam);
  const job = Number.isInteger(id) && id > 0 ? await getLiveJobPosting(id) : null;
  return { content, job };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { content, job } = await loadJob((await params).id);
  if (!job) return { title: `Not found | ${content.brandName}` };
  return {
    title: `${job.title} | ${content.brandName}`,
    description: job.summary || `${job.title} at ${content.brandName}.`,
    alternates: { canonical: `/jobs/${job.id}` },
  };
}

export default async function JobDetailPage({ params }: Params) {
  const { content, job } = await loadJob((await params).id);
  if (!job) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";
  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.summary,
    datePosted: job.createdAt || undefined,
    employmentType: job.employmentType ? job.employmentType.toUpperCase().replace(/[\s-]+/g, "_") : undefined,
    hiringOrganization: { "@type": "Organization", name: content.brandName, sameAs: siteUrl },
    jobLocation: job.location
      ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } }
      : undefined,
  };

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/jobs">Careers</Link>
          <span aria-hidden="true">/</span>
          <span>{job.title}</span>
        </nav>

        <div className="gm-section-heading">
          <p className="gm-eyebrow">Careers</p>
          <h1>{job.title}</h1>
          <p className="gm-job-detail__meta">
            {[job.location, job.employmentType].filter(Boolean).join(" · ")}
          </p>
          {job.summary ? <p className="gm-brands__lead">{job.summary}</p> : null}
          <div className="gm-job-detail__apply">
            {job.applyUrl ? (
              <a className="gm-btn gm-btn--primary" href={job.applyUrl} rel="noreferrer" target="_blank">
                Apply for this role
              </a>
            ) : (
              <a className="gm-btn gm-btn--primary" href={`mailto:${content.inquiryEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>
                Apply via email
              </a>
            )}
          </div>
        </div>

        <div className="gm-doc__body gm-job-detail__body">
          {job.description ? <DocBody body={job.description} brandName={content.brandName} inquiryEmail={content.inquiryEmail} /> : null}

          {job.requirements ? (
            <>
              <h2>Requirements</h2>
              <DocBody body={job.requirements} brandName={content.brandName} inquiryEmail={content.inquiryEmail} />
            </>
          ) : null}

          {job.compensation ? (
            <>
              <h2>Compensation</h2>
              <DocBody body={job.compensation} brandName={content.brandName} inquiryEmail={content.inquiryEmail} />
            </>
          ) : null}

          {job.benefits ? (
            <>
              <h2>Benefits</h2>
              <DocBody body={job.benefits} brandName={content.brandName} inquiryEmail={content.inquiryEmail} />
            </>
          ) : null}
        </div>

        <div className="gm-blog-cta">
          <p>Ready to apply?</p>
          {job.applyUrl ? (
            <a className="gm-btn gm-btn--primary" href={job.applyUrl} rel="noreferrer" target="_blank">
              Apply for this role
            </a>
          ) : (
            <a className="gm-btn gm-btn--primary" href={`mailto:${content.inquiryEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>
              Apply via email
            </a>
          )}
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
        type="application/ld+json"
      />
    </section>
  );
}
