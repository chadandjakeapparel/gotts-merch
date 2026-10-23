import { createJob, listJobs } from "@/lib/portal/jobs";
import { handle, readJson } from "@/lib/portal/http";
import { toJobInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { client: true }, async ({ clientId }) => ({ jobs: await listJobs(clientId) }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true, client: true }, async ({ clientId }) => {
    const id = await createJob(clientId, toJobInput(await readJson(request)));
    return { id };
  });
}
