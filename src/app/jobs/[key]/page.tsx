import { notFound } from "next/navigation";
import { clientIdForJobsKey, clientName } from "@/lib/portal/accounts";
import { listJobs } from "@/lib/portal/jobs";

export const dynamic = "force-dynamic";

const JOB_STATUS_LABEL: Record<string, string> = {
  quote: "Quote",
  in_production: "In production",
  proof_sent: "Proof sent",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};
const FILE_KIND_LABEL: Record<string, string> = { proof: "Proof", estimate: "Estimate", other: "Other" };

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PublicJobsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const clientId = await clientIdForJobsKey(key);
  if (!clientId) notFound();
  const [name, jobs] = await Promise.all([clientName(clientId), listJobs(clientId)]);

  return (
    <>
      <header className="portal-top">
        <div className="portal-top-inner">
          <span className="portal-mark">Gotts Merch — Jobs</span>
        </div>
      </header>
      <main className="portal-main">
        <div className="portal-title-row">
          <div>
            <span className="portal-eyebrow">Jobs for</span>
            <h1>{name}</h1>
          </div>
        </div>

        {jobs.length ? (
          <div className="portal-jobs-public">
            {jobs.map((j) => (
              <section className="portal-panel" key={j.id}>
                <div className="portal-panel-head">
                  <h2>{j.title}</h2>
                  <span className={`portal-kind ${j.status}`}>{JOB_STATUS_LABEL[j.status] || j.status}</span>
                </div>
                <div className="portal-job-detail">
                  {j.notes ? <p>{j.notes}</p> : null}
                  {j.files.length ? (
                    <ul className="portal-job-files">
                      {j.files.map((f) => (
                        <li key={f.id}>
                          <a href={f.url} rel="noreferrer" target="_blank">{f.filename}</a>
                          <span className="portal-kind">{FILE_KIND_LABEL[f.kind] || f.kind}</span>
                          <span className="portal-muted small">{fmtDate(f.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="portal-muted small">Nothing uploaded yet.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="portal-panel portal-empty">
            <h3>No jobs yet</h3>
            <p className="portal-muted">Check back here once a job is added for you.</p>
          </section>
        )}
      </main>
    </>
  );
}
