import { redirect } from "next/navigation";
import { JobsApp } from "@/components/portal/jobs-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { listCustomers, listSalesReps } from "@/lib/portal/customers";
import { listJobs } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

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
      <PortalHeader current="jobs" viewer={toViewer(user)} />
      <main className="portal-main">
        <JobsApp
          currentUserName={user.name || user.email}
          initialCustomers={customers}
          initialJobs={jobs}
          initialSalesReps={salesReps}
          initialTasks={tasks}
          loadError={loadError}
          staffUsers={staffUsers}
        />
      </main>
    </div>
  );
}
