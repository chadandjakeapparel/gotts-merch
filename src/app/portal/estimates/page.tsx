import Link from "next/link";
import { EstimateReviewApp } from "@/components/portal/estimate-review-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { getEstimateForClient } from "@/lib/portal/estimates";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const user = await requireUser();
  const viewer = toViewer(user);

  if (user.role === "staff") {
    return (
      <div className="portal">
        <PortalHeader current="estimates" viewer={viewer} />
        <main className="portal-main narrow">
          <section className="portal-panel portal-empty">
            <h1>Estimates</h1>
            <p className="portal-muted">Build and send a lead&apos;s estimate from its card on the CRM board.</p>
            <Link className="portal-btn primary" href="/portal/crm">Go to CRM</Link>
          </section>
        </main>
      </div>
    );
  }

  let estimate = null;
  let loadError = "";
  try {
    estimate = await getEstimateForClient(user.clientId!);
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The estimate couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="estimates" viewer={viewer} />
      <main className="portal-main narrow">
        <EstimateReviewApp initialEstimate={estimate} loadError={loadError} />
      </main>
    </div>
  );
}
