import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JobsApp } from "@/components/portal/jobs-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listCustomers, listSalesReps } from "@/lib/portal/customers";
import { listJobs } from "@/lib/portal/jobs";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "jobs"))) {
    return (
      <div className="portal">
        <PortalHeader current="jobs" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="the Job Board" />
        </main>
      </div>
    );
  }

  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let salesReps: Awaited<ReturnType<typeof listSalesReps>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let loadError = "";
  const [jobsResult, customersResult, repsResult, usersResult, tasksResult] = await Promise.allSettled([
    listJobs(),
    listCustomers(),
    listSalesReps(),
    listUsers(),
    listTasks(),
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
  const staffUsers =
    usersResult.status === "fulfilled"
      ? usersResult.value.filter((u) => u.role === "staff").map((u) => ({ id: u.id, name: u.name, email: u.email }))
      : [];
  if (tasksResult.status === "fulfilled") tasks = tasksResult.value;
  else console.error("[portal]", tasksResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="jobs" viewer={await toViewer(user)} />
      <main className="portal-main">
        <Suspense fallback={null}>
          <JobsApp
            currentUserName={user.name || user.email}
            initialCustomers={customers}
            initialJobs={jobs}
            initialSalesReps={salesReps}
            initialTasks={tasks}
            loadError={loadError}
            staffUsers={staffUsers}
          />
        </Suspense>
      </main>
    </div>
  );
}
