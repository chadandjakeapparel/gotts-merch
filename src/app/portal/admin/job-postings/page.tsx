import { redirect } from "next/navigation";
import { JobPostingsApp } from "@/components/portal/job-postings-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listJobPostings } from "@/lib/portal/job-postings";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function JobPostingsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let initialJobPostings: Awaited<ReturnType<typeof listJobPostings>> = [];
  let loadError = "";
  try {
    initialJobPostings = await listJobPostings();
  } catch (error) {
    console.error("[portal]", error);
    loadError = "Job postings couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="job-postings" viewer={toViewer(user)} />
      <main className="portal-main">
        <JobPostingsApp initialJobPostings={initialJobPostings} loadError={loadError} />
      </main>
    </div>
  );
}
