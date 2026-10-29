import { notFound, redirect } from "next/navigation";
import { CustomerDetailApp } from "@/components/portal/customer-detail-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listUsers } from "@/lib/portal/accounts";
import { getCustomer, listCustomers, listSalesReps } from "@/lib/portal/customers";
import { listJobsByCustomer } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Params) {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const customer = await getCustomer(id);
  if (!customer) notFound();

  let jobs: Awaited<ReturnType<typeof listJobsByCustomer>> = [];
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let salesReps: Awaited<ReturnType<typeof listSalesReps>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let loadError = "";
  const [jobsResult, customersResult, repsResult, usersResult, tasksResult] = await Promise.allSettled([
    listJobsByCustomer(id),
    listCustomers(),
    listSalesReps(),
    listUsers(),
    listTasks(),
  ]);
  if (jobsResult.status === "fulfilled") {
    jobs = jobsResult.value;
  } else {
    console.error("[portal]", jobsResult.reason);
    loadError = "This customer's jobs couldn't be loaded. Refresh the page to try again.";
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
      <PortalHeader current="customers" viewer={toViewer(user)} />
      <main className="portal-main">
        <CustomerDetailApp
          currentUserName={user.name || user.email}
          customer={customer}
          initialCustomers={customers}
          initialJobs={jobs}
          initialTasks={tasks}
          loadError={loadError}
          salesReps={salesReps}
          staffUsers={staffUsers}
        />
      </main>
    </div>
  );
}
