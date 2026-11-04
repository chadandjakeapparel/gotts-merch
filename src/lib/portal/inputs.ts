import type { CatalogItemInput } from "./catalog-items";
import { parseContactMethod, type LeadInput } from "./crm";
import type { CustomerInput } from "./customers";
import type { ItemInput, OrderInput } from "./data";
import type { EstimateInput } from "./estimates";
import type { JobInput } from "./jobs";
import type { JobPostingInput } from "./job-postings";
import type { PurchaseOrderInput, PurchaseOrderLineInput } from "./purchase-orders";
import type { TaskInput } from "./tasks";
import type { Address, JobPostingStatus, PurchaseOrderStatus } from "./types";
import type { VendorInput } from "./vendors";
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
    notes: text(body.notes, 10000),
  };
}

export function toVendorInput(body: Record<string, unknown>): VendorInput {
  return {
    name: text(body.name, 200),
    contactName: text(body.contactName, 200),
    email: text(body.email, 200),
    phone: text(body.phone, 60),
    address: toAddressInput(body.address),
    notes: text(body.notes, 2000),
  };
}

const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ["draft", "sent", "received", "cancelled"];

export function toPurchaseOrderInput(body: Record<string, unknown>): PurchaseOrderInput {
  const vendorId = body.vendorId == null || body.vendorId === "" ? null : int(body.vendorId);
  const jobIds = Array.isArray(body.jobIds) ? body.jobIds : [];
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const status = PURCHASE_ORDER_STATUSES.includes(body.status as PurchaseOrderStatus)
    ? (body.status as PurchaseOrderStatus)
    : "draft";
  return {
    vendorId: vendorId != null && Number.isFinite(vendorId) ? vendorId : null,
    jobIds: jobIds.map((j) => int(j)).filter((j) => Number.isFinite(j)),
    status,
    notes: text(body.notes, 2000),
    lines: lines.map((l) => {
      const line = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
      const unitCost = money(line.unitCost);
      return {
        itemName: text(line.itemName, 300),
        description: text(line.description, 2000),
        color: text(line.color, 80),
        size: text(line.size, 40),
        quantity: int(line.quantity) || 0,
        unitCost: Number.isFinite(unitCost) ? unitCost : 0,
      } satisfies PurchaseOrderLineInput;
    }),
  };
}

export function toJobPostingInput(body: Record<string, unknown>): JobPostingInput {
  const status: JobPostingStatus = body.status === "live" ? "live" : "not_live";
  return {
    title: text(body.title, 200),
    location: text(body.location, 200),
    employmentType: text(body.employmentType, 80),
    summary: text(body.summary, 500),
    description: text(body.description, 20000),
    requirements: text(body.requirements, 20000),
    compensation: text(body.compensation, 2000),
    benefits: text(body.benefits, 20000),
    applyUrl: text(body.applyUrl, 500),
    status,
  };
}

export function toJobInput(body: Record<string, unknown>): JobInput {
  const customerId = body.customerId == null || body.customerId === "" ? null : int(body.customerId);
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
  const taxRate = money(body.taxRate);
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
    salesOrderNumber: text(body.salesOrderNumber, 80),
    invoiceNumber: text(body.invoiceNumber, 80),
    notes: text(body.notes, 2000),
    lineItems: lineItems.map((li) => {
      const l = (li && typeof li === "object" ? li : {}) as Record<string, unknown>;
      return {
        itemName: text(l.itemName, 300),
        description: text(l.description, 2000),
        color: text(l.color, 80),
        size: text(l.size, 40),
        quantity: int(l.quantity),
        unitPrice: money(l.unitPrice),
        taxable: Boolean(l.taxable),
      };
    }),
    taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0,
  };
}

export function toEstimateInput(body: Record<string, unknown>): EstimateInput {
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
  const taxRate = money(body.taxRate);
  return {
    lineItems: lineItems.map((li) => {
      const l = (li && typeof li === "object" ? li : {}) as Record<string, unknown>;
      return {
        itemName: text(l.itemName, 300),
        description: text(l.description, 2000),
        color: text(l.color, 80),
        size: text(l.size, 40),
        quantity: int(l.quantity),
        unitPrice: money(l.unitPrice),
        taxable: Boolean(l.taxable),
      };
    }),
    taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0,
    notes: text(body.notes, 2000),
  };
}

export function toCatalogItemInput(body: Record<string, unknown>): CatalogItemInput {
  return {
    itemNumber: text(body.itemNumber, 120),
    displayName: text(body.displayName, 300),
    itemType: text(body.itemType, 120),
    primaryVendor: text(body.primaryVendor, 200),
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
