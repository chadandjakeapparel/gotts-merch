import { createJob, listJobs } from "@/lib/portal/jobs";
import { handle, readJson } from "@/lib/portal/http";
import { toJobInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ jobs: await listJobs() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async ({ user }) => {
    const body = await readJson(request);
    const id = await createJob(toJobInput(body), user.name || user.email);
    return { id };
  });
}
