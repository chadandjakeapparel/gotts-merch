import { createUser, listUsersByClient } from "./accounts";
import { addActivity, ensureLeadClient, setLeadStatus } from "./crm";
import { db } from "./db";
import { PortalError } from "./http";
import { createJob } from "./jobs";
import type { Estimate, EstimateLineItem, EstimateStatus, OpenEstimateSummary } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

function toLineItem(r: Row): EstimateLineItem {
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

function toEstimate(r: Row, lineItems: EstimateLineItem[]): Estimate {
  return {
    id: num(r.id),
    leadId: num(r.lead_id),
    status: r.status as EstimateStatus,
    lineItems,
    taxRate: num(r.tax_rate),
    notes: str(r.notes),
    createdBy: str(r.created_by),
    sentAt: iso(r.sent_at),
    approvedAt: iso(r.approved_at),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

/** Subtotal, taxable base, tax, and grand total -- tax applies only to line items marked taxable. */
export function estimateTotals(estimate: Estimate) {
  const subtotal = estimate.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxableSubtotal = estimate.lineItems
    .filter((li) => li.taxable)
    .reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = Math.round(taxableSubtotal * (estimate.taxRate / 100) * 100) / 100;
  return { subtotal, taxableSubtotal, tax, total: subtotal + tax };
}

/** Numbering starts at 1401 (estimate id 1) instead of 1, so existing and future estimates read "EST-01401", "EST-01402", etc. */
const ESTIMATE_NUMBER_OFFSET = 1400;

/** "EST-01402" -- derived straight from the estimate's id, so it needs no counter of its own and never collides. */
export function estimateNumber(id: number): string {
  return `EST-${String(id + ESTIMATE_NUMBER_OFFSET).padStart(5, "0")}`;
}

/** The one estimate for a lead, for staff building or reviewing it in the CRM. */
export async function getEstimateForLead(leadId: number): Promise<Estimate | null> {
  const sql = await db();
  const [row] = await sql`select * from estimates where lead_id = ${leadId}`;
  if (!row) return null;
  const lineItems = await sql`select * from estimate_line_items where estimate_id = ${row.id} order by sort_order, id`;
  return toEstimate(row, lineItems.map(toLineItem));
}

/** The one estimate a signed-in client can see -- resolved from their own clientId, never a client-supplied id. */
export async function getEstimateForClient(clientId: number): Promise<Estimate | null> {
  const sql = await db();
  const [row] = await sql`
    select e.* from estimates e join leads l on l.id = e.lead_id
    where l.client_id = ${clientId} and e.status != 'draft'`;
  if (!row) return null;
  const lineItems = await sql`select * from estimate_line_items where estimate_id = ${row.id} order by sort_order, id`;
  return toEstimate(row, lineItems.map(toLineItem));
}

/** Every estimate not yet approved, across all leads -- for the KPIs "Open estimates" drill-down. */
export async function listOpenEstimates(): Promise<OpenEstimateSummary[]> {
  const sql = await db();
  const [rows, lineItems] = await Promise.all([
    sql`
      select e.*, l.company_name, l.contact_name from estimates e join leads l on l.id = e.lead_id
      where e.status != 'approved' order by e.created_at desc`,
    sql`select * from estimate_line_items order by estimate_id, sort_order`,
  ]);
  const linesByEstimate = new Map<number, Row[]>();
  for (const li of lineItems) {
    const id = num(li.estimate_id);
    linesByEstimate.set(id, [...(linesByEstimate.get(id) || []), li]);
  }
  return rows.map((r) => {
    const estimate = toEstimate(r, (linesByEstimate.get(num(r.id)) || []).map(toLineItem));
    return {
      id: estimate.id,
      leadId: estimate.leadId,
      leadTitle: str(r.company_name) || str(r.contact_name) || "Untitled lead",
      status: estimate.status,
      createdAt: estimate.createdAt,
      total: estimateTotals(estimate).total,
    };
  });
}

export type EstimateLineItemInput = {
  itemName: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};
export type EstimateInput = { lineItems: EstimateLineItemInput[]; taxRate: number; notes: string };

function requireEstimate(input: EstimateInput) {
  if (!input.lineItems.length) throw new PortalError("Add at least one line item.");
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

/**
 * Saves (creating if needed) a lead's estimate -- staff-only. Editing after
 * it's been sent doesn't change its status; sending again is what re-sends
 * it to the customer. Approved estimates are locked.
 */
export async function saveEstimateDraft(leadId: number, input: EstimateInput, createdBy: string): Promise<number> {
  requireEstimate(input);
  const sql = await db();
  const leads = await sql`select id from leads where id = ${leadId}`;
  if (!leads.length) throw new PortalError("That lead no longer exists.", 404);
  return sql.begin(async (tx) => {
    const [existing] = await tx`select id, status from estimates where lead_id = ${leadId} for update`;
    if (existing && existing.status === "approved") {
      throw new PortalError("This estimate is already approved and can't be edited.");
    }
    let id: number;
    if (existing) {
      id = Number(existing.id);
      await tx`update estimates set tax_rate = ${input.taxRate}, notes = ${input.notes}, updated_at = now() where id = ${id}`;
      await tx`delete from estimate_line_items where estimate_id = ${id}`;
    } else {
      const [row] = await tx`
        insert into estimates (lead_id, tax_rate, notes, created_by)
        values (${leadId}, ${input.taxRate}, ${input.notes}, ${createdBy}) returning id`;
      id = Number(row.id);
    }
    let sortOrder = 0;
    for (const li of input.lineItems) {
      await tx`
        insert into estimate_line_items (estimate_id, item_name, description, color, size, quantity, unit_price, taxable, sort_order)
        values (
          ${id}, ${li.itemName}, ${li.description}, ${li.color}, ${li.size}, ${li.quantity}, ${li.unitPrice}, ${li.taxable}, ${sortOrder++}
        )`;
    }
    return id;
  });
}

/**
 * Sends a lead's estimate to the customer: links (creating if needed) the
 * client the customer signs in as, creates their first login the first
 * time (no email is sent in v1 -- staff hand over the one-time password
 * themselves), marks the estimate sent, and moves the lead to "Proposal
 * sent".
 */
export async function sendEstimateForApproval(
  leadId: number,
  createdBy: string,
): Promise<{ clientId: number; credentials: { email: string; password: string } | null }> {
  const sql = await db();
  const [estimate] = await sql`select id, status from estimates where lead_id = ${leadId}`;
  if (!estimate) throw new PortalError("Build an estimate before sending it.");
  if (estimate.status === "approved") throw new PortalError("This estimate is already approved.");
  const [{ n }] = await sql`select count(*)::int as n from estimate_line_items where estimate_id = ${estimate.id}`;
  if (!n) throw new PortalError("Add at least one line item before sending.");

  const clientId = await ensureLeadClient(leadId);
  let credentials: { email: string; password: string } | null = null;
  if (!(await listUsersByClient(clientId)).length) {
    const [lead] = await sql`select email, contact_name, company_name from leads where id = ${leadId}`;
    const email = str(lead?.email).trim();
    if (!email) throw new PortalError("Add an email address to this lead before sending -- it's needed for their login.");
    const name = str(lead?.contact_name) || str(lead?.company_name) || "";
    credentials = await createUser({ email, name, role: "client", clientId });
  }

  await sql`update estimates set status = 'sent', sent_at = now(), updated_at = now() where id = ${estimate.id}`;
  await setLeadStatus(leadId, "proposal", createdBy);
  const sent = await getEstimateForLead(leadId);
  const { total } = estimateTotals(sent!);
  await addActivity(leadId, "estimate", `Estimate sent for approval ($${total.toFixed(2)})`, createdBy);

  return { clientId, credentials };
}

/**
 * Links the lead's client to a customer (so an approved estimate's job has
 * somewhere to attach), creating one named after the lead the first time
 * this lead is approved.
 */
async function ensureLeadCustomer(leadId: number): Promise<number> {
  const sql = await db();
  const [lead] = await sql`select client_id, company_name, contact_name, email, phone from leads where id = ${leadId}`;
  if (!lead) throw new PortalError("That lead no longer exists.", 404);
  const clientId = lead.client_id == null ? null : Number(lead.client_id);
  if (clientId == null) throw new PortalError("This lead has no linked client yet.");
  const [existing] = await sql`select id from customers where client_id = ${clientId}`;
  if (existing) return Number(existing.id);
  const companyName = str(lead.company_name);
  const contactName = str(lead.contact_name);
  const [first, ...rest] = contactName.split(" ");
  return sql.begin(async (tx) => {
    const [row] = await tx`
      insert into customers (kind, company_name, first_name, last_name, phone, point_of_contact, client_id)
      values (
        ${companyName ? "company" : "individual"}, ${companyName}, ${companyName ? "" : first || ""},
        ${companyName ? "" : rest.join(" ")}, ${str(lead.phone)}, ${contactName}, ${clientId}
      ) returning id`;
    const customerId = Number(row.id);
    const email = str(lead.email).trim();
    if (email) await tx`insert into customer_emails (customer_id, email) values (${customerId}, ${email})`;
    return customerId;
  });
}

/**
 * The customer's approval: locks the estimate, moves the lead to Won,
 * links it to a customer, and creates the Job Board job from the line
 * items. Always resolved from the signed-in client's own clientId.
 */
export async function approveEstimate(clientId: number, approvedBy: string): Promise<{ jobId: number }> {
  const sql = await db();
  const [row] = await sql`
    select e.id, e.lead_id, e.status from estimates e join leads l on l.id = e.lead_id where l.client_id = ${clientId}`;
  if (!row) throw new PortalError("There's no estimate to approve.", 404);
  if (row.status === "approved") throw new PortalError("This estimate has already been approved.");
  if (row.status !== "sent") throw new PortalError("This estimate isn't ready to approve yet.");
  const estimateId = Number(row.id);
  const leadId = Number(row.lead_id);

  await sql`update estimates set status = 'approved', approved_at = now(), updated_at = now() where id = ${estimateId}`;
  const estimate = await getEstimateForLead(leadId);
  if (!estimate) throw new PortalError("That estimate no longer exists.", 404);
  const { total } = estimateTotals(estimate);

  const [lead] = await sql`select company_name, contact_name, job_name from leads where id = ${leadId}`;
  await setLeadStatus(leadId, "won", approvedBy);
  const customerId = await ensureLeadCustomer(leadId);

  const jobId = await createJob(
    {
      customerId,
      jobName: str(lead?.job_name) || str(lead?.company_name) || str(lead?.contact_name) || "New job",
      contactName: str(lead?.contact_name),
      inHandDate: "",
      goodsOrdered: false,
      poNumbers: "",
      decorationType: "",
      quantity: estimate.lineItems.reduce((sum, li) => sum + li.quantity, 0),
      productionFacility: "",
      salesOrderNumber: "",
      invoiceNumber: "",
      notes: estimate.notes,
      lineItems: estimate.lineItems.map((li) => ({
        itemName: li.itemName,
        description: li.description,
        color: li.color,
        size: li.size,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
      })),
      taxRate: estimate.taxRate,
      estimateId,
    },
    approvedBy,
  );

  await addActivity(leadId, "estimate", `Estimate approved by customer ($${total.toFixed(2)}) -- job board job created`, approvedBy);
  return { jobId };
}

/**
 * The customer's "request changes": always resolved from the signed-in
 * client's own clientId, never a client-supplied estimate id.
 */
export async function requestEstimateChanges(clientId: number, message: string, requestedBy: string): Promise<void> {
  const body = message.trim();
  if (!body) throw new PortalError("Describe what you'd like changed.");
  const sql = await db();
  const [row] = await sql`
    select e.id, e.lead_id, e.status from estimates e join leads l on l.id = e.lead_id where l.client_id = ${clientId}`;
  if (!row) throw new PortalError("There's no estimate to respond to.", 404);
  if (row.status !== "sent") throw new PortalError("This estimate isn't awaiting approval.");
  const estimateId = Number(row.id);
  const leadId = Number(row.lead_id);
  await sql`update estimates set status = 'changes_requested', updated_at = now() where id = ${estimateId}`;
  await addActivity(leadId, "estimate", `Customer requested changes: "${body}"`, requestedBy);
}
