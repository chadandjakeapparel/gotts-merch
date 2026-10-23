import { redirect } from "next/navigation";
import { CrmApp } from "@/components/portal/crm-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listCustomers } from "@/lib/portal/customers";
import { listLeads } from "@/lib/portal/crm";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let loadError = "";
  const [users, leadsResult, customersResult] = await Promise.allSettled([listUsers(), listLeads(), listCustomers()]);
  const staffNames = users.status === "fulfilled" ? users.value.filter((u) => u.role === "staff").map((u) => u.name || u.email) : [];
  if (leadsResult.status === "fulfilled") leads = leadsResult.value;
  else {
    console.error("[portal]", leadsResult.reason);
    loadError = "The CRM board couldn't be loaded. Refresh the page to try again.";
  }
  if (customersResult.status === "fulfilled") customers = customersResult.value;
  else console.error("[portal]", customersResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="crm" viewer={toViewer(user)} />
      <main className="portal-main">
        <CrmApp initialCustomers={customers} initialLeads={leads} loadError={loadError} staffNames={staffNames} />
      </main>
    </div>
  );
}
