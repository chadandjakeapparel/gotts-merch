import { createJob, listJobs } from "@/lib/portal/jobs";
import { handle, readJson } from "@/lib/portal/http";
import { toJobInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ jobs: await listJobs() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await createJob(toJobInput(body));
    return { id };
  });
}
