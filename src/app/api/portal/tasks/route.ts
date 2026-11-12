import { createTask, listTasks } from "@/lib/portal/tasks";
import { handle, readJson } from "@/lib/portal/http";
import { toTaskInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true, area: "tasks" }, async () => ({ tasks: await listTasks() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true, area: "tasks" }, async ({ user }) => {
    const body = await readJson(request);
    const id = await createTask(toTaskInput(body), user.id);
    return { id };
  });
}
