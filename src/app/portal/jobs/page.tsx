import { redirect } from "next/navigation";
import { JobsApp } from "@/components/portal/jobs-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listCustomers, listSalesReps } from "@/lib/portal/customers";
import { listJobs } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let salesReps: Awaited<ReturnType<typeof listSalesReps>> = [];
  let loadError = "";
  const [jobsResult, customersResult, repsResult] = await Promise.allSettled([
    listJobs(),
    listCustomers(),
    listSalesReps(),
  ]);
  if (jobsResult.status === "fulfilled") {
    jobs = jobsResult.value;
  } else {
    console.error("[portal]", jobsResult.reason);
    loadError = "The job board couldn't be loaded. Refresh the page to try again.";
  }
  if (customersResult.status === "fulfilled") customers = customersResult.value;
  else console.error("[portal]", customersResult.reason);
  if (repsResult.status === "fulfilled") salesReps = repsResult.value;
  else console.error("[portal]", repsResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="jobs" viewer={toViewer(user)} />
      <main className="portal-main">
        <JobsApp initialCustomers={customers} initialJobs={jobs} initialSalesReps={salesReps} loadError={loadError} />
      </main>
    </div>
  );
}
