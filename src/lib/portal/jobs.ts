import { del, put } from "@vercel/blob";
import { db } from "./db";
import { PortalError } from "./http";
import type { Job, JobFile, JobStatus } from "./types";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

export const JOB_STATUSES: JobStatus[] = ["quote", "in_production", "proof_sent", "approved", "completed", "cancelled"];
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  quote: "Quote",
  in_production: "In production",
  proof_sent: "Proof sent",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};

function toFile(r: Row): JobFile {
  return {
    id: num(r.id),
    kind: r.kind as JobFile["kind"],
    filename: str(r.filename),
    url: str(r.url),
    uploadedBy: str(r.uploaded_by),
    createdAt: iso(r.created_at) || "",
  };
}

function toJob(r: Row, files: JobFile[]): Job {
  return {
    id: num(r.id),
    clientId: num(r.client_id),
    title: str(r.title),
    status: r.status as JobStatus,
    contactName: str(r.contact_name),
    contactEmail: str(r.contact_email),
    notes: str(r.notes),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
    files,
  };
}

async function withFiles(sql: Awaited<ReturnType<typeof db>>, rows: Row[]): Promise<Job[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => num(r.id));
  const files = await sql`select * from job_files where job_id in ${sql(ids)} order by created_at desc`;
  const byJob = new Map<number, JobFile[]>();
  for (const f of files) {
    const id = num(f.job_id);
    byJob.set(id, [...(byJob.get(id) || []), toFile(f)]);
  }
  return rows.map((r) => toJob(r, byJob.get(num(r.id)) || []));
}

export async function listJobs(clientId: number): Promise<Job[]> {
  const sql = await db();
  const rows = await sql`select * from jobs where client_id = ${clientId} order by created_at desc`;
  return withFiles(sql, rows);
}

export type JobInput = {
  title: string;
  status: JobStatus;
  contactName: string;
  contactEmail: string;
  notes: string;
};

export async function createJob(clientId: number, input: JobInput): Promise<number> {
  if (!input.title.trim()) throw new PortalError("Give the job a title.");
  const sql = await db();
  const [row] = await sql`
    insert into jobs (client_id, title, status, contact_name, contact_email, notes)
    values (${clientId}, ${input.title}, ${input.status}, ${input.contactName}, ${input.contactEmail}, ${input.notes})
    returning id`;
  return Number(row.id);
}

export async function updateJob(clientId: number, id: number, input: JobInput) {
  if (!input.title.trim()) throw new PortalError("Give the job a title.");
  const sql = await db();
  const rows = await sql`
    update jobs set title = ${input.title}, status = ${input.status}, contact_name = ${input.contactName},
      contact_email = ${input.contactEmail}, notes = ${input.notes}, updated_at = now()
    where id = ${id} and client_id = ${clientId} returning id`;
  if (!rows.length) throw new PortalError("That job no longer exists.", 404);
}

export async function deleteJob(clientId: number, id: number) {
  const sql = await db();
  const files = await sql`
    select f.url from job_files f join jobs j on j.id = f.job_id where f.job_id = ${id} and j.client_id = ${clientId}`;
  const rows = await sql`delete from jobs where id = ${id} and client_id = ${clientId} returning id`;
  if (!rows.length) throw new PortalError("That job no longer exists.", 404);
  await Promise.all(files.map((f) => del(str(f.url)).catch(() => {})));
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const FILE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "ai", "eps", "psd", "doc", "docx", "xls", "xlsx"]);

export async function addJobFile(
  clientId: number,
  jobId: number,
  kind: JobFile["kind"],
  file: File,
  uploadedBy: string,
) {
  if (file.size > MAX_FILE_BYTES) throw new PortalError("That file is too large (max 20MB).");
  const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
  const extension = FILE_EXTENSIONS[file.type] || (ALLOWED_EXTENSIONS.has(nameExt) ? nameExt : "");
  if (!extension) throw new PortalError("That file type isn't supported. Use a PDF, image, or common design/office file.");

  const sql = await db();
  const [job] = await sql`select id from jobs where id = ${jobId} and client_id = ${clientId}`;
  if (!job) throw new PortalError("That job no longer exists.", 404);

  const blob = await put(`jobs/${clientId}/${jobId}/${Date.now()}.${extension}`, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
  });
  await sql`
    insert into job_files (job_id, kind, filename, url, uploaded_by)
    values (${jobId}, ${kind}, ${file.name.slice(0, 200)}, ${blob.url}, ${uploadedBy})`;
}

export async function deleteJobFile(clientId: number, jobId: number, fileId: number) {
  const sql = await db();
  const [row] = await sql`
    select f.url from job_files f join jobs j on j.id = f.job_id
    where f.id = ${fileId} and f.job_id = ${jobId} and j.client_id = ${clientId}`;
  if (!row) return;
  await sql`delete from job_files where id = ${fileId}`;
  await del(str(row.url)).catch(() => {});
}
