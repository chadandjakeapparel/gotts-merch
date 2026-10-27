import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { TasksApp } from "@/components/portal/tasks-app";
import { listUsers } from "@/lib/portal/accounts";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listTasks } from "@/lib/portal/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let loadError = "";
  const [usersResult, tasksResult] = await Promise.allSettled([listUsers(), listTasks()]);
  const staffUsers =
    usersResult.status === "fulfilled"
      ? usersResult.value.filter((u) => u.role === "staff").map((u) => ({ id: u.id, name: u.name, email: u.email }))
      : [];
  if (tasksResult.status === "fulfilled") {
    tasks = tasksResult.value;
  } else {
    console.error("[portal]", tasksResult.reason);
    loadError = "The task list couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="tasks" viewer={toViewer(user)} />
      <main className="portal-main">
        <TasksApp currentUserName={user.name || user.email} initialTasks={tasks} loadError={loadError} staffUsers={staffUsers} />
      </main>
    </div>
  );
}
