import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CrmApp } from "@/components/portal/crm-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listLeads } from "@/lib/portal/crm";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "crm"))) {
    return (
      <div className="portal">
        <PortalHeader current="crm" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="CRM" />
        </main>
      </div>
    );
  }

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
      <PortalHeader current="crm" viewer={await toViewer(user)} />
      <main className="portal-main">
        <Suspense fallback={null}>
          <CrmApp
            currentUserName={user.name || user.email}
            initialLeads={leads}
            initialTasks={tasks}
            loadError={loadError}
            staffNames={staffNames}
            staffUsers={staffUsers}
          />
        </Suspense>
      </main>
    </div>
  );
}
