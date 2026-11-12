import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KpisApp } from "@/components/portal/kpis-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listOpenEstimates } from "@/lib/portal/estimates";
import { listJobs } from "@/lib/portal/jobs";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "kpis"))) {
    return (
      <div className="portal">
        <PortalHeader current="kpis" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="KPIs" />
        </main>
      </div>
    );
  }

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
      <PortalHeader current="kpis" viewer={await toViewer(user)} />
      <main className="portal-main">
        <Suspense fallback={null}>
          <KpisApp initialJobs={jobs} initialOpenEstimates={openEstimates} loadError={loadError} />
        </Suspense>
      </main>
    </div>
  );
}
