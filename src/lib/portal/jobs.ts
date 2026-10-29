import { db } from "./db";
import { PortalError } from "./http";
import type { Job, JobActivity, JobFile, JobStatus } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));
const isoDate = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : "");

export const JOB_STATUSES: JobStatus[] = ["pending", "in_production", "ready", "delivered"];
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Pending",
  in_production: "In Production",
  ready: "Ready to Ship/Pickup",
  delivered: "Delivered",
};

export function parseJobStatus(value: unknown): JobStatus {
  const s = String(value ?? "");
  if ((JOB_STATUSES as string[]).includes(s)) return s as JobStatus;
  throw new PortalError("That isn't a stage this board uses.");
}

function toActivity(r: Row): JobActivity {
  return {
    id: num(r.id),
    kind: r.kind as JobActivity["kind"],
    body: str(r.body),
    createdBy: str(r.created_by),
    createdAt: iso(r.created_at) || "",
  };
}

function toFile(r: Row): JobFile {
  return {
    id: num(r.id),
    fileName: str(r.file_name),
    url: str(r.url),
    contentType: str(r.content_type),
    size: num(r.size),
    uploadedBy: str(r.uploaded_by),
    createdAt: iso(r.created_at) || "",
  };
}

function toJob(r: Row, activities: JobActivity[], files: JobFile[]): Job {
  return {
    id: num(r.id),
    customerId: r.customer_id == null ? null : num(r.customer_id),
    jobName: str(r.job_name),
    contactName: str(r.contact_name),
    status: r.status as JobStatus,
    inHandDate: isoDate(r.in_hand_date),
    goodsOrdered: Boolean(r.goods_ordered),
    poNumbers: str(r.po_numbers),
    decorationType: str(r.decoration_type),
    quantity: num(r.quantity),
    productionFacility: str(r.production_facility),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
    activities,
    files,
  };
}

export async function listJobs(): Promise<Job[]> {
  const sql = await db();
  const [jobs, activities, files] = await Promise.all([
    sql`select * from jobs order by updated_at desc`,
    sql`select * from job_activities order by created_at desc`,
    sql`select * from job_files order by created_at desc`,
  ]);
  const activitiesByJob = new Map<number, JobActivity[]>();
  for (const r of activities) {
    const id = num(r.job_id);
    activitiesByJob.set(id, [...(activitiesByJob.get(id) || []), toActivity(r)]);
  }
  const filesByJob = new Map<number, JobFile[]>();
  for (const r of files) {
    const id = num(r.job_id);
    filesByJob.set(id, [...(filesByJob.get(id) || []), toFile(r)]);
  }
  return jobs.map((r) => toJob(r, activitiesByJob.get(num(r.id)) || [], filesByJob.get(num(r.id)) || []));
}

export type JobInput = {
  customerId: number | null;
  jobName: string;
  contactName: string;
  inHandDate: string;
  goodsOrdered: boolean;
  poNumbers: string;
  decorationType: string;
  quantity: number;
  productionFacility: string;
};

function requireJob(input: JobInput) {
  if (!input.customerId) throw new PortalError("Choose a customer for this job.");
  if (!input.jobName.trim()) throw new PortalError("Give the job a name.");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new PortalError("Quantity must be a whole number, 0 or more.");
  }
}

function asFkError(error: unknown) {
  return (error as { code?: string }).code === "23503" ? new PortalError("Choose a valid customer.", 400) : error;
}

function describeChange(label: string, oldValue: string, newValue: string): string {
  if (!oldValue) return `${label} set to "${newValue}"`;
  if (!newValue) return `${label} cleared (was "${oldValue}")`;
  return `${label} changed from "${oldValue}" to "${newValue}"`;
}

/** Compares a job's current row against a save's input, as a list of human-readable change lines. */
function diffJob(existing: Row, input: JobInput): string[] {
  const changes: string[] = [];
  const oldCustomerId = existing.customer_id == null ? null : num(existing.customer_id);
  if (oldCustomerId !== input.customerId) changes.push("Customer changed");
  if (str(existing.job_name) !== input.jobName) {
    changes.push(describeChange("Job name", str(existing.job_name), input.jobName));
  }
  if (str(existing.contact_name) !== input.contactName) {
    changes.push(describeChange("Contact name", str(existing.contact_name), input.contactName));
  }
  if (isoDate(existing.in_hand_date) !== (input.inHandDate || "")) {
    changes.push(describeChange("In-hand date", isoDate(existing.in_hand_date), input.inHandDate));
  }
  if (Boolean(existing.goods_ordered) !== input.goodsOrdered) {
    changes.push(`Goods ordered marked as ${input.goodsOrdered ? "ordered" : "not ordered"}`);
  }
  if (str(existing.po_numbers) !== input.poNumbers) {
    changes.push(describeChange("PO numbers", str(existing.po_numbers), input.poNumbers));
  }
  if (str(existing.decoration_type) !== input.decorationType) {
    changes.push(describeChange("Decoration type", str(existing.decoration_type), input.decorationType));
  }
  if (num(existing.quantity) !== input.quantity) {
    changes.push(`Quantity changed from ${num(existing.quantity)} to ${input.quantity}`);
  }
  if (str(existing.production_facility) !== input.productionFacility) {
    changes.push(describeChange("Production facility", str(existing.production_facility), input.productionFacility));
  }
  return changes;
}

export async function createJob(input: JobInput, createdBy: string): Promise<number> {
  requireJob(input);
  const sql = await db();
  try {
    const [row] = await sql`
      insert into jobs (
        customer_id, job_name, contact_name, in_hand_date, goods_ordered, po_numbers,
        decoration_type, quantity, production_facility
      ) values (
        ${input.customerId}, ${input.jobName}, ${input.contactName}, ${input.inHandDate || null},
        ${input.goodsOrdered}, ${input.poNumbers}, ${input.decorationType}, ${input.quantity},
        ${input.productionFacility}
      ) returning id`;
    const id = Number(row.id);
    await sql`insert into job_activities (job_id, kind, body, created_by) values (${id}, 'status', 'Job created', ${createdBy})`;
    return id;
  } catch (error) {
    throw asFkError(error);
  }
}

export async function updateJob(id: number, input: JobInput, createdBy: string) {
  requireJob(input);
  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      const [existing] = await tx`select * from jobs where id = ${id} for update`;
      if (!existing) throw new PortalError("That job no longer exists.", 404);
      const changes = diffJob(existing, input);
      await tx`
        update jobs set
          customer_id = ${input.customerId}, job_name = ${input.jobName}, contact_name = ${input.contactName},
          in_hand_date = ${input.inHandDate || null}, goods_ordered = ${input.goodsOrdered},
          po_numbers = ${input.poNumbers}, decoration_type = ${input.decorationType},
          quantity = ${input.quantity}, production_facility = ${input.productionFacility}, updated_at = now()
        where id = ${id}`;
      for (const message of changes) {
        await tx`insert into job_activities (job_id, kind, body, created_by) values (${id}, 'change', ${message}, ${createdBy})`;
      }
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function setJobStatus(id: number, status: JobStatus, createdBy: string) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [job] = await tx`select * from jobs where id = ${id} for update`;
    if (!job) throw new PortalError("That job no longer exists.", 404);
    const changed = str(job.status) !== status;
    await tx`update jobs set status = ${status}, updated_at = now() where id = ${id}`;
    if (changed) {
      const label = JOB_STATUS_LABEL[status];
      await tx`
        insert into job_activities (job_id, kind, body, created_by) values (${id}, 'status', ${`Status changed to ${label}`}, ${createdBy})`;
    }
  });
}

export async function addJobActivity(jobId: number, body: string, createdBy: string) {
  if (!body.trim()) throw new PortalError("Write something before saving.");
  const sql = await db();
  const rows = await sql`select id from jobs where id = ${jobId}`;
  if (!rows.length) throw new PortalError("That job no longer exists.", 404);
  await sql`insert into job_activities (job_id, kind, body, created_by) values (${jobId}, 'note', ${body}, ${createdBy})`;
  await sql`update jobs set updated_at = now() where id = ${jobId}`;
}

export async function deleteJob(id: number) {
  const sql = await db();
  await sql`delete from jobs where id = ${id}`;
}

export type JobFileInput = {
  fileName: string;
  url: string;
  contentType: string;
  size: number;
};

export async function addJobFile(jobId: number, input: JobFileInput, uploadedBy: string): Promise<JobFile> {
  const sql = await db();
  const rows = await sql`select id from jobs where id = ${jobId}`;
  if (!rows.length) throw new PortalError("That job no longer exists.", 404);
  const [row] = await sql`
    insert into job_files (job_id, file_name, url, content_type, size, uploaded_by)
    values (${jobId}, ${input.fileName}, ${input.url}, ${input.contentType}, ${input.size}, ${uploadedBy})
    returning *`;
  await sql`update jobs set updated_at = now() where id = ${jobId}`;
  return toFile(row);
}

export async function deleteJobFile(jobId: number, fileId: number) {
  const sql = await db();
  await sql`delete from job_files where id = ${fileId} and job_id = ${jobId}`;
}
