import { randomBytes } from "node:crypto";
import { db } from "./db";
import { PortalError } from "./http";
import type { Lead, LeadActivity, LeadStatus } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

export const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

export function parseStatus(value: unknown): LeadStatus {
  const s = String(value ?? "");
  if ((STATUSES as string[]).includes(s)) return s as LeadStatus;
  throw new PortalError("That isn't a stage this board uses.");
}

const ACTIVITY_KINDS: LeadActivity["kind"][] = ["note", "call", "email", "meeting", "status"];
export function parseActivityKind(value: unknown): LeadActivity["kind"] {
  const s = String(value ?? "note");
  return (ACTIVITY_KINDS as string[]).includes(s) ? (s as LeadActivity["kind"]) : "note";
}

function toActivity(r: Row): LeadActivity {
  return {
    id: num(r.id),
    kind: r.kind as LeadActivity["kind"],
    body: str(r.body),
    createdBy: str(r.created_by),
    createdAt: iso(r.created_at) || "",
  };
}

function toLead(r: Row, activities: LeadActivity[]): Lead {
  return {
    id: num(r.id),
    companyName: str(r.company_name),
    contactName: str(r.contact_name),
    email: str(r.email),
    phone: str(r.phone),
    source: str(r.source),
    status: r.status as LeadStatus,
    estimatedValue: num(r.estimated_value),
    owner: str(r.owner),
    notes: str(r.notes),
    lostReason: str(r.lost_reason),
    clientId: r.client_id == null ? null : num(r.client_id),
    openJobCount: num(r.open_job_count),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
    activities,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const sql = await db();
  const [leads, activities] = await Promise.all([
    sql`
      select l.*, coalesce(j.open_job_count, 0) as open_job_count
      from leads l
      left join (
        select client_id, count(*)::int as open_job_count
        from jobs
        where status not in ('completed', 'cancelled')
        group by client_id
      ) j on j.client_id = l.client_id
      order by l.updated_at desc`,
    sql`select * from lead_activities order by created_at desc`,
  ]);
  const byLead = new Map<number, LeadActivity[]>();
  for (const r of activities) {
    const id = num(r.lead_id);
    byLead.set(id, [...(byLead.get(id) || []), toActivity(r)]);
  }
  return leads.map((r) => toLead(r, byLead.get(num(r.id)) || []));
}

export type LeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string;
  estimatedValue: number;
  owner: string;
  notes: string;
};

function requireName(input: LeadInput) {
  if (!input.companyName.trim() && !input.contactName.trim()) {
    throw new PortalError("Give the lead a company name or a contact name.");
  }
}

export async function createLead(input: LeadInput, createdBy: string): Promise<number> {
  requireName(input);
  const sql = await db();
  const [row] = await sql`
    insert into leads (company_name, contact_name, email, phone, source, estimated_value, owner, notes)
    values (${input.companyName}, ${input.contactName}, ${input.email}, ${input.phone}, ${input.source}, ${input.estimatedValue}, ${input.owner}, ${input.notes})
    returning id`;
  const id = Number(row.id);
  await sql`insert into lead_activities (lead_id, kind, body, created_by) values (${id}, 'status', 'Lead created', ${createdBy})`;
  return id;
}

export async function updateLead(id: number, input: LeadInput) {
  requireName(input);
  const sql = await db();
  const rows = await sql`
    update leads set
      company_name = ${input.companyName}, contact_name = ${input.contactName}, email = ${input.email},
      phone = ${input.phone}, source = ${input.source}, estimated_value = ${input.estimatedValue},
      owner = ${input.owner}, notes = ${input.notes}, updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That lead no longer exists.", 404);
}

/**
 * Moves a lead to a stage, logging the change. The first time a lead is
 * marked Won it becomes a client (inventory, orders, JotForm link) so order
 * flow can continue there; later saves keep the same client.
 */
export async function setLeadStatus(
  id: number,
  status: LeadStatus,
  createdBy: string,
  opts: { lostReason?: string } = {},
): Promise<{ clientId: number | null; changed: boolean }> {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [lead] = await tx`select * from leads where id = ${id} for update`;
    if (!lead) throw new PortalError("That lead no longer exists.", 404);
    const changed = str(lead.status) !== status;
    let clientId: number | null = lead.client_id == null ? null : Number(lead.client_id);
    if (status === "won" && !clientId) {
      const name = str(lead.company_name) || str(lead.contact_name) || "New client";
      const [row] = await tx`
        insert into clients (name, webhook_key) values (${name}, ${randomBytes(18).toString("base64url")}) returning id`;
      clientId = Number(row.id);
    }
    const lostReason = status === "lost" ? opts.lostReason ?? str(lead.lost_reason) : "";
    await tx`
      update leads set status = ${status}, client_id = ${clientId}, lost_reason = ${lostReason}, updated_at = now()
      where id = ${id}`;
    if (changed) {
      const label = STATUS_LABEL[status] + (status === "lost" && lostReason ? `: ${lostReason}` : "");
      await tx`
        insert into lead_activities (lead_id, kind, body, created_by) values (${id}, 'status', ${`Status changed to ${label}`}, ${createdBy})`;
    }
    return { clientId, changed };
  });
}

export async function addActivity(leadId: number, kind: LeadActivity["kind"], body: string, createdBy: string) {
  if (!body.trim()) throw new PortalError("Write something before saving.");
  const sql = await db();
  const rows = await sql`select id from leads where id = ${leadId}`;
  if (!rows.length) throw new PortalError("That lead no longer exists.", 404);
  await sql`insert into lead_activities (lead_id, kind, body, created_by) values (${leadId}, ${kind}, ${body}, ${createdBy})`;
  await sql`update leads set updated_at = now() where id = ${leadId}`;
}

export async function deleteLead(id: number) {
  const sql = await db();
  await sql`delete from leads where id = ${id}`;
}
