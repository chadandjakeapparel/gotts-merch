import { redirect } from "next/navigation";
import { CrmApp } from "@/components/portal/crm-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listLeads } from "@/lib/portal/crm";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let loadError = "";
  const [users, leadsResult, tasksResult] = await Promise.allSettled([listUsers(), listLeads(), listTasks()]);
  const staffList = users.status === "fulfilled" ? users.value.filter((u) => u.role === "staff") : [];
  const staffNames = staffList.map((u) => u.name || u.email);
  const staffUsers = staffList.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  if (leadsResult.status === "fulfilled") leads = leadsResult.value;
  else {
    console.error("[portal]", leadsResult.reason);
    loadError = "The CRM board couldn't be loaded. Refresh the page to try again.";
  }
  if (tasksResult.status === "fulfilled") tasks = tasksResult.value;
  else console.error("[portal]", tasksResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="crm" viewer={toViewer(user)} />
      <main className="portal-main">
        <CrmApp
          currentUserName={user.name || user.email}
          initialLeads={leads}
          initialTasks={tasks}
          loadError={loadError}
          staffNames={staffNames}
          staffUsers={staffUsers}
        />
      </main>
    </div>
  );
}
