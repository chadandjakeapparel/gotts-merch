import { db } from "./db";
import { PortalError } from "./http";
import type { Job, JobStatus } from "./types";

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

function toJob(r: Row): Job {
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
  };
}

export async function listJobs(): Promise<Job[]> {
  const sql = await db();
  const rows = await sql`select * from jobs order by updated_at desc`;
  return rows.map(toJob);
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

export async function createJob(input: JobInput): Promise<number> {
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
    return Number(row.id);
  } catch (error) {
    throw asFkError(error);
  }
}

export async function updateJob(id: number, input: JobInput) {
  requireJob(input);
  const sql = await db();
  try {
    const rows = await sql`
      update jobs set
        customer_id = ${input.customerId}, job_name = ${input.jobName}, contact_name = ${input.contactName},
        in_hand_date = ${input.inHandDate || null}, goods_ordered = ${input.goodsOrdered},
        po_numbers = ${input.poNumbers}, decoration_type = ${input.decorationType},
        quantity = ${input.quantity}, production_facility = ${input.productionFacility}, updated_at = now()
      where id = ${id} returning id`;
    if (!rows.length) throw new PortalError("That job no longer exists.", 404);
  } catch (error) {
    throw asFkError(error);
  }
}

export async function setJobStatus(id: number, status: JobStatus) {
  const sql = await db();
  const rows = await sql`update jobs set status = ${status}, updated_at = now() where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That job no longer exists.", 404);
}

export async function deleteJob(id: number) {
  const sql = await db();
  await sql`delete from jobs where id = ${id}`;
}
