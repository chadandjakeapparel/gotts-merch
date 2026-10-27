import { db } from "./db";
import { PortalError } from "./http";
import type { Task } from "./types";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));
const dateOnly = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : "");

function toTask(r: Row): Task {
  return {
    id: num(r.id),
    name: str(r.name),
    notes: str(r.notes),
    completeBy: dateOnly(r.complete_by),
    completed: Boolean(r.completed),
    completedAt: iso(r.completed_at),
    assignedToUserId: r.assigned_to_user_id == null ? null : num(r.assigned_to_user_id),
    assignedToName: str(r.assigned_to_name) || str(r.assigned_to_email),
    assignedByUserId: r.assigned_by_user_id == null ? null : num(r.assigned_by_user_id),
    assignedByName: str(r.assigned_by_name) || str(r.assigned_by_email),
    leadId: r.lead_id == null ? null : num(r.lead_id),
    leadTitle: str(r.lead_title),
    jobId: r.job_id == null ? null : num(r.job_id),
    jobTitle: str(r.job_title),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

/** For the Tasks page, and for the task lists embedded in a CRM lead or Job Board job. */
export async function listTasks(): Promise<Task[]> {
  const sql = await db();
  const rows = await sql`
    select
      t.*,
      au.name as assigned_to_name, au.email as assigned_to_email,
      bu.name as assigned_by_name, bu.email as assigned_by_email,
      coalesce(nullif(l.company_name, ''), l.contact_name) as lead_title,
      j.job_name as job_title
    from tasks t
    left join users au on au.id = t.assigned_to_user_id
    left join users bu on bu.id = t.assigned_by_user_id
    left join leads l on l.id = t.lead_id
    left join jobs j on j.id = t.job_id
    order by t.completed asc, t.complete_by asc nulls last, t.created_at desc`;
  return rows.map(toTask);
}

export type TaskInput = {
  name: string;
  notes: string;
  completeBy: string;
  assignedToUserId: number | null;
  leadId: number | null;
  jobId: number | null;
};

async function requireStaffAssignee(id: number | null) {
  if (id == null) return;
  const sql = await db();
  const [row] = await sql`select role from users where id = ${id}`;
  if (!row || row.role !== "staff") throw new PortalError("Choose a valid person to assign this to.");
}

function requireName(input: TaskInput) {
  if (!input.name.trim()) throw new PortalError("Give the task a name.");
}

export async function createTask(input: TaskInput, assignedByUserId: number): Promise<number> {
  requireName(input);
  await requireStaffAssignee(input.assignedToUserId);
  const sql = await db();
  const [row] = await sql`
    insert into tasks (name, notes, complete_by, assigned_to_user_id, assigned_by_user_id, lead_id, job_id)
    values (
      ${input.name}, ${input.notes}, ${input.completeBy || null},
      ${input.assignedToUserId}, ${assignedByUserId}, ${input.leadId}, ${input.jobId}
    ) returning id`;
  return Number(row.id);
}

export async function updateTask(id: number, input: TaskInput): Promise<void> {
  requireName(input);
  await requireStaffAssignee(input.assignedToUserId);
  const sql = await db();
  const rows = await sql`
    update tasks set
      name = ${input.name}, notes = ${input.notes}, complete_by = ${input.completeBy || null},
      assigned_to_user_id = ${input.assignedToUserId}, lead_id = ${input.leadId}, job_id = ${input.jobId},
      updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That task no longer exists.", 404);
}

export async function setTaskCompleted(id: number, completed: boolean): Promise<void> {
  const sql = await db();
  const rows = await sql`
    update tasks set completed = ${completed}, completed_at = ${completed ? sql`now()` : null}, updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That task no longer exists.", 404);
}

export async function deleteTask(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from tasks where id = ${id}`;
}
