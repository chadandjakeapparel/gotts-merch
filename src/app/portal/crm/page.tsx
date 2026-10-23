import { redirect } from "next/navigation";
import { CrmApp } from "@/components/portal/crm-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listLeads } from "@/lib/portal/crm";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let loadError = "";
  const [users, leadsResult] = await Promise.allSettled([listUsers(), listLeads()]);
  const staffNames = users.status === "fulfilled" ? users.value.filter((u) => u.role === "staff").map((u) => u.name || u.email) : [];
  if (leadsResult.status === "fulfilled") leads = leadsResult.value;
  else {
    console.error("[portal]", leadsResult.reason);
    loadError = "The CRM board couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="crm" viewer={toViewer(user)} />
      <main className="portal-main">
        <CrmApp initialLeads={leads} loadError={loadError} staffNames={staffNames} />
      </main>
    </div>
  );
}
