import { db } from "./db";
import { PortalError } from "./http";
import type { JobPosting, JobPostingStatus } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));

function toJobPosting(r: Row): JobPosting {
  return {
    id: Number(r.id),
    title: str(r.title),
    location: str(r.location),
    employmentType: str(r.employment_type),
    summary: str(r.summary),
    description: str(r.description),
    requirements: str(r.requirements),
    compensation: str(r.compensation),
    benefits: str(r.benefits),
    applyUrl: str(r.apply_url),
    status: (r.status as JobPostingStatus) || "not_live",
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

/** Every posting, newest-updated first -- for the admin list. */
export async function listJobPostings(): Promise<JobPosting[]> {
  const sql = await db();
  const rows = await sql`select * from job_postings order by updated_at desc`;
  return rows.map(toJobPosting);
}

/** Only the postings visible on the public Jobs page. */
export async function listLiveJobPostings(): Promise<JobPosting[]> {
  const sql = await db();
  const rows = await sql`select * from job_postings where status = 'live' order by updated_at desc`;
  return rows.map(toJobPosting);
}

export async function getJobPosting(id: number): Promise<JobPosting | null> {
  const sql = await db();
  const [row] = await sql`select * from job_postings where id = ${id}`;
  return row ? toJobPosting(row) : null;
}

/** A live posting by id -- for the public job detail page; hides draft/unpublished postings from direct links. */
export async function getLiveJobPosting(id: number): Promise<JobPosting | null> {
  const sql = await db();
  const [row] = await sql`select * from job_postings where id = ${id} and status = 'live'`;
  return row ? toJobPosting(row) : null;
}

export type JobPostingInput = {
  title: string;
  location: string;
  employmentType: string;
  summary: string;
  description: string;
  requirements: string;
  compensation: string;
  benefits: string;
  applyUrl: string;
  status: JobPostingStatus;
};

function requireJobPosting(input: JobPostingInput) {
  if (!input.title.trim()) throw new PortalError("Give the job a title.");
}

export async function createJobPosting(input: JobPostingInput): Promise<number> {
  requireJobPosting(input);
  const sql = await db();
  const [row] = await sql`
    insert into job_postings (
      title, location, employment_type, summary, description, requirements, compensation, benefits, apply_url, status
    ) values (
      ${input.title}, ${input.location}, ${input.employmentType}, ${input.summary}, ${input.description},
      ${input.requirements}, ${input.compensation}, ${input.benefits}, ${input.applyUrl}, ${input.status}
    ) returning id`;
  return Number(row.id);
}

export async function updateJobPosting(id: number, input: JobPostingInput): Promise<void> {
  requireJobPosting(input);
  const sql = await db();
  const rows = await sql`
    update job_postings set
      title = ${input.title}, location = ${input.location}, employment_type = ${input.employmentType},
      summary = ${input.summary}, description = ${input.description}, requirements = ${input.requirements},
      compensation = ${input.compensation}, benefits = ${input.benefits}, apply_url = ${input.applyUrl},
      status = ${input.status}, updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That job posting no longer exists.", 404);
}

export async function deleteJobPosting(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from job_postings where id = ${id}`;
}
