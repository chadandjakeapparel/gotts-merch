import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KpisApp } from "@/components/portal/kpis-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listJobs } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let loadError = "";
  try {
    jobs = await listJobs();
  } catch (err) {
    console.error("[portal]", err);
    loadError = "KPIs couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="kpis" viewer={toViewer(user)} />
      <main className="portal-main">
        <Suspense fallback={null}>
          <KpisApp initialJobs={jobs} loadError={loadError} />
        </Suspense>
      </main>
    </div>
  );
}
