import { db } from "./db";
import { PortalError } from "./http";
import type { Job, JobActivity, JobFile, JobLineItem, JobStatus } from "./types";

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

function toLineItem(r: Row): JobLineItem {
  return {
    id: num(r.id),
    itemName: str(r.item_name),
    description: str(r.description),
    color: str(r.color),
    size: str(r.size),
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price),
    taxable: Boolean(r.taxable),
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

function toJob(r: Row, activities: JobActivity[], files: JobFile[], lineItems: JobLineItem[]): Job {
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
    salesOrderNumber: str(r.sales_order_number),
    invoiceNumber: str(r.invoice_number),
    notes: str(r.notes),
    estimateId: r.estimate_id == null ? null : num(r.estimate_id),
    lineItems,
    taxRate: num(r.tax_rate),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
    activities,
    files,
  };
}

/** Subtotal, tax, and grand total for a job's own line items -- tax applies only to lines marked taxable. Same shape as estimateTotals. */
export function jobTotals(job: Pick<Job, "lineItems" | "taxRate">) {
  const subtotal = job.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxableSubtotal = job.lineItems.filter((li) => li.taxable).reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = Math.round(taxableSubtotal * (job.taxRate / 100) * 100) / 100;
  return { subtotal, taxableSubtotal, tax, total: subtotal + tax };
}

function byJobId<T extends Row>(rows: readonly T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const r of rows) {
    const id = num(r.job_id);
    map.set(id, [...(map.get(id) || []), r]);
  }
  return map;
}

export async function listJobs(): Promise<Job[]> {
  const sql = await db();
  const [jobs, activities, files, lines] = await Promise.all([
    sql`select * from jobs order by updated_at desc`,
    sql`select * from job_activities order by created_at desc`,
    sql`select * from job_files order by created_at desc`,
    sql`select * from job_line_items order by job_id, sort_order`,
  ]);
  const activitiesByJob = byJobId(activities);
  const filesByJob = byJobId(files);
  const linesByJob = byJobId(lines);
  return jobs.map((r) =>
    toJob(
      r,
      (activitiesByJob.get(num(r.id)) || []).map(toActivity),
      (filesByJob.get(num(r.id)) || []).map(toFile),
      (linesByJob.get(num(r.id)) || []).map(toLineItem),
    ),
  );
}

/** For a customer's record page: just their jobs, newest first. */
export async function listJobsByCustomer(customerId: number): Promise<Job[]> {
  const sql = await db();
  const [jobs, activities, files, lines] = await Promise.all([
    sql`select * from jobs where customer_id = ${customerId} order by created_at desc`,
    sql`select ja.* from job_activities ja join jobs j on j.id = ja.job_id where j.customer_id = ${customerId}`,
    sql`select jf.* from job_files jf join jobs j on j.id = jf.job_id where j.customer_id = ${customerId}`,
    sql`select jl.* from job_line_items jl join jobs j on j.id = jl.job_id where j.customer_id = ${customerId} order by jl.job_id, jl.sort_order`,
  ]);
  const activitiesByJob = byJobId(activities);
  const filesByJob = byJobId(files);
  const linesByJob = byJobId(lines);
  return jobs.map((r) =>
    toJob(
      r,
      (activitiesByJob.get(num(r.id)) || []).map(toActivity),
      (filesByJob.get(num(r.id)) || []).map(toFile),
      (linesByJob.get(num(r.id)) || []).map(toLineItem),
    ),
  );
}

/** A single job by id, for the PDF export route -- avoids loading every job just to print one. */
export async function getJob(id: number): Promise<Job | null> {
  const sql = await db();
  const [[row], activities, files, lines] = await Promise.all([
    sql`select * from jobs where id = ${id}`,
    sql`select * from job_activities where job_id = ${id} order by created_at desc`,
    sql`select * from job_files where job_id = ${id} order by created_at desc`,
    sql`select * from job_line_items where job_id = ${id} order by sort_order`,
  ]);
  if (!row) return null;
  return toJob(row, activities.map(toActivity), files.map(toFile), lines.map(toLineItem));
}

export type JobLineItemInput = {
  itemName: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

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
  salesOrderNumber: string;
  invoiceNumber: string;
  notes: string;
  /** Carried over from an approved estimate, or built up directly on the job -- unlike an estimate, a job may have none. */
  lineItems: JobLineItemInput[];
  taxRate: number;
  /** Set internally when this job is auto-created from an approved estimate -- never from client input. */
  estimateId?: number | null;
};

function requireJob(input: JobInput) {
  if (!input.customerId) throw new PortalError("Choose a customer for this job.");
  if (!input.jobName.trim()) throw new PortalError("Give the job a name.");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new PortalError("Quantity must be a whole number, 0 or more.");
  }
  for (const li of input.lineItems) {
    if (!li.itemName.trim()) throw new PortalError("Give every line item a name.");
    if (!Number.isInteger(li.quantity) || li.quantity <= 0) {
      throw new PortalError("Quantities must be whole numbers greater than 0.");
    }
    if (!Number.isFinite(li.unitPrice) || li.unitPrice < 0) {
      throw new PortalError("Unit prices can't be negative.");
    }
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) {
    throw new PortalError("Tax rate must be between 0 and 100.");
  }
}

async function saveJobLineItems(tx: Awaited<ReturnType<typeof db>>, jobId: number, lineItems: JobLineItemInput[]) {
  await tx`delete from job_line_items where job_id = ${jobId}`;
  let sortOrder = 0;
  for (const li of lineItems) {
    await tx`
      insert into job_line_items (job_id, item_name, description, color, size, quantity, unit_price, taxable, sort_order)
      values (
        ${jobId}, ${li.itemName}, ${li.description}, ${li.color}, ${li.size}, ${li.quantity}, ${li.unitPrice}, ${li.taxable}, ${sortOrder++}
      )`;
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
  if (str(existing.sales_order_number) !== input.salesOrderNumber) {
    changes.push(describeChange("Sales Order Number", str(existing.sales_order_number), input.salesOrderNumber));
  }
  if (str(existing.invoice_number) !== input.invoiceNumber) {
    changes.push(describeChange("Invoice Number", str(existing.invoice_number), input.invoiceNumber));
  }
  if (str(existing.notes) !== input.notes) {
    changes.push("Notes updated");
  }
  return changes;
}

export async function createJob(input: JobInput, createdBy: string): Promise<number> {
  requireJob(input);
  const sql = await db();
  try {
    return await sql.begin(async (tx) => {
      // A blank Sales Order Number gets the next one off the shared counter,
      // so every job is numbered without staff having to track it themselves;
      // one given explicitly (e.g. importing older jobs) is kept as-is.
      const salesOrderNumber = input.salesOrderNumber.trim();
      const [row] = await tx`
        insert into jobs (
          customer_id, job_name, contact_name, in_hand_date, goods_ordered, po_numbers,
          decoration_type, quantity, production_facility, sales_order_number, invoice_number, notes,
          tax_rate, estimate_id
        ) values (
          ${input.customerId}, ${input.jobName}, ${input.contactName}, ${input.inHandDate || null},
          ${input.goodsOrdered}, ${input.poNumbers}, ${input.decorationType}, ${input.quantity},
          ${input.productionFacility},
          ${salesOrderNumber || tx`'SO-GM' || nextval('sales_order_number_seq')::text`},
          ${input.invoiceNumber}, ${input.notes}, ${input.taxRate}, ${input.estimateId ?? null}
        ) returning id`;
      const id = Number(row.id);
      await saveJobLineItems(tx, id, input.lineItems);
      await tx`insert into job_activities (job_id, kind, body, created_by) values (${id}, 'status', 'Job created', ${createdBy})`;
      return id;
    });
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
          quantity = ${input.quantity}, production_facility = ${input.productionFacility},
          sales_order_number = ${input.salesOrderNumber}, invoice_number = ${input.invoiceNumber},
          notes = ${input.notes}, tax_rate = ${input.taxRate}, updated_at = now()
        where id = ${id}`;
      await saveJobLineItems(tx, id, input.lineItems);
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
