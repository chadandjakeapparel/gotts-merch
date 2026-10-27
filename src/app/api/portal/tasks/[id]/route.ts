import { deleteTask, setTaskCompleted, updateTask } from "@/lib/portal/tasks";
import { handle, int, readJson } from "@/lib/portal/http";
import { toTaskInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

/** Saves the task's fields and, if `completed` is included, toggles it done/not done. */
export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    if (body.completed != null) {
      await setTaskCompleted(id, Boolean(body.completed));
    } else {
      await updateTask(id, toTaskInput(body));
    }
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deleteTask(int((await params).id));
    return {};
  });
}
