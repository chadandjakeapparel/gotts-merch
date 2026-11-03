import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/content";
import { listLiveJobPostings } from "@/lib/portal/job-postings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Careers | ${content.brandName}`,
    description: `Open positions at ${content.brandName}.`,
    alternates: { canonical: "/jobs" },
  };
}

export default async function JobsPage() {
  const content = await getSiteContent();
  let jobPostings: Awaited<ReturnType<typeof listLiveJobPostings>> = [];
  try {
    jobPostings = await listLiveJobPostings();
  } catch (error) {
    console.error("[jobs]", error);
  }

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <div className="gm-section-heading">
          <p className="gm-eyebrow">Careers</p>
          <h1>Join {content.brandName}</h1>
          <p className="gm-brands__lead">
            We&rsquo;re always looking for people who care about great work and great clients. Here&rsquo;s what&rsquo;s open right now.
          </p>
        </div>

        {jobPostings.length ? (
          <div className="gm-jobs-list">
            {jobPostings.map((job) => (
              <Link className="gm-job-card" href={`/jobs/${job.id}`} key={job.id}>
                <div className="gm-job-card__main">
                  <h2>{job.title}</h2>
                  {job.summary ? <p>{job.summary}</p> : null}
                </div>
                <div className="gm-job-card__meta">
                  {job.location ? <span className="gm-job-tag">{job.location}</span> : null}
                  {job.employmentType ? <span className="gm-job-tag">{job.employmentType}</span> : null}
                  <span aria-hidden="true" className="gm-job-card__arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="gm-blog-empty">
            <h2>No open positions right now</h2>
            <p>Check back soon, or reach out — we&rsquo;re always happy to hear from great people.</p>
          </div>
        )}
      </div>
    </section>
  );
}
