import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KpisApp } from "@/components/portal/kpis-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listOpenEstimates } from "@/lib/portal/estimates";
import { listJobs } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let openEstimates: Awaited<ReturnType<typeof listOpenEstimates>> = [];
  let loadError = "";
  const [jobsResult, estimatesResult] = await Promise.allSettled([listJobs(), listOpenEstimates()]);
  if (jobsResult.status === "fulfilled") {
    jobs = jobsResult.value;
  } else {
    console.error("[portal]", jobsResult.reason);
    loadError = "KPIs couldn't be loaded. Refresh the page to try again.";
  }
  if (estimatesResult.status === "fulfilled") openEstimates = estimatesResult.value;
  else console.error("[portal]", estimatesResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="kpis" viewer={toViewer(user)} />
      <main className="portal-main">
        <Suspense fallback={null}>
          <KpisApp initialJobs={jobs} initialOpenEstimates={openEstimates} loadError={loadError} />
        </Suspense>
      </main>
    </div>
  );
}
