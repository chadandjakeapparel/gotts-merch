import { createJobPosting, listJobPostings } from "@/lib/portal/job-postings";
import { handle, readJson } from "@/lib/portal/http";
import { toJobPostingInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true, area: "job-postings" }, async () => {
    const jobPostings = await listJobPostings();
    return { jobPostings };
  });
}

export async function POST(request: Request) {
  return handle(request, { staff: true, area: "job-postings" }, async () => {
    const body = await readJson(request);
    const id = await createJobPosting(toJobPostingInput(body));
    return { id };
  });
}
