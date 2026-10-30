import { parseContactMethod, type LeadInput } from "./crm";
import type { CustomerInput } from "./customers";
import type { ItemInput, OrderInput } from "./data";
import type { JobInput } from "./jobs";
import type { TaskInput } from "./tasks";
import type { Address } from "./types";
import { int, money, PortalError, text } from "./http";

export function toTaskInput(body: Record<string, unknown>): TaskInput {
  const assignedToUserId = body.assignedToUserId == null || body.assignedToUserId === "" ? null : int(body.assignedToUserId);
  const leadId = body.leadId == null || body.leadId === "" ? null : int(body.leadId);
  const jobId = body.jobId == null || body.jobId === "" ? null : int(body.jobId);
  return {
    name: text(body.name, 200),
    notes: text(body.notes, 2000),
    completeBy: text(body.completeBy, 20),
    assignedToUserId: assignedToUserId != null && Number.isFinite(assignedToUserId) ? assignedToUserId : null,
    leadId: leadId != null && Number.isFinite(leadId) ? leadId : null,
    jobId: jobId != null && Number.isFinite(jobId) ? jobId : null,
  };
}

export function toLeadInput(body: Record<string, unknown>): LeadInput {
  const value = money(body.estimatedValue);
  return {
    companyName: text(body.companyName, 200),
    contactName: text(body.contactName, 200),
    jobName: text(body.jobName, 200),
    email: text(body.email, 200),
    phone: text(body.phone, 60),
    source: text(body.source, 120),
    contactMethod: parseContactMethod(body.contactMethod),
    estimatedValue: Number.isFinite(value) && value > 0 ? value : 0,
    owner: text(body.owner, 120),
    notes: text(body.notes, 2000),
  };
}

export function toAddressInput(value: unknown): Address {
  const a = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    name: text(a.name, 200),
    line1: text(a.line1, 200),
    line2: text(a.line2, 200),
    city: text(a.city, 120),
    state: text(a.state, 60),
    zip: text(a.zip, 20),
    country: text(a.country, 60) || "US",
  };
}

export function toCustomerInput(body: Record<string, unknown>): CustomerInput {
  const emails = Array.isArray(body.emails) ? body.emails : [];
  const salesRepId = body.salesRepId == null || body.salesRepId === "" ? null : int(body.salesRepId);
  return {
    kind: body.kind === "individual" ? "individual" : "company",
    companyName: text(body.companyName, 200),
    firstName: text(body.firstName, 120),
    lastName: text(body.lastName, 120),
    billingAddress: toAddressInput(body.billingAddress),
    shippingAddress: toAddressInput(body.shippingAddress),
    emails: emails.map((e) => text(e, 200)).filter(Boolean),
    phone: text(body.phone, 60),
    pointOfContact: text(body.pointOfContact, 200),
    salesRepId: salesRepId != null && Number.isFinite(salesRepId) ? salesRepId : null,
    subscribed: Boolean(body.subscribed),
    inventoryHeld: Boolean(body.inventoryHeld),
    notes: text(body.notes, 2000),
  };
}

export function toJobInput(body: Record<string, unknown>): JobInput {
  const customerId = body.customerId == null || body.customerId === "" ? null : int(body.customerId);
  return {
    customerId: customerId != null && Number.isFinite(customerId) ? customerId : null,
    jobName: text(body.jobName, 200),
    contactName: text(body.contactName, 200),
    inHandDate: text(body.inHandDate, 20),
    goodsOrdered: Boolean(body.goodsOrdered),
    poNumbers: text(body.poNumbers, 300),
    decorationType: text(body.decorationType, 120),
    quantity: int(body.quantity),
    productionFacility: text(body.productionFacility, 200),
  };
}

export function toItemInput(body: Record<string, unknown>): ItemInput {
  const heldForCustomerId = body.heldForCustomerId == null || body.heldForCustomerId === "" ? null : int(body.heldForCustomerId);
  return {
    styleNumber: text(body.styleNumber, 80),
    styleName: text(body.styleName, 200),
    color: text(body.color, 80),
    size: text(body.size, 40),
    qty: int(body.qty),
    unitValue: money(body.unitValue),
    heldForCustomerId: heldForCustomerId != null && Number.isFinite(heldForCustomerId) ? heldForCustomerId : null,
  };
}

export function toOrderInput(body: Record<string, unknown>): OrderInput {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  return {
    ref: text(body.ref, 120),
    customerName: text(body.customerName, 200),
    shipTo: text(body.shipTo, 600),
    email: text(body.email, 200),
    notes: text(body.notes, 1000),
    lines: lines.map((l) => {
      const line = (l || {}) as Record<string, unknown>;
      const itemId = line.itemId == null || line.itemId === "" ? null : int(line.itemId);
      const qty = int(line.qty);
      if (itemId != null && !Number.isFinite(itemId)) throw new PortalError("A line has an unknown style.");
      if (!Number.isFinite(qty) || qty < 0) throw new PortalError("Every line needs a whole-number quantity.");
      return {
        itemId,
        qty,
        styleNumber: text(line.styleNumber, 80),
        styleName: text(line.styleName, 200),
        color: text(line.color, 80),
        size: text(line.size, 40),
        rawText: text(line.rawText, 500),
      };
    }),
  };
}
