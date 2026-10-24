import type { LeadInput } from "./crm";
import type { CustomerInput } from "./customers";
import type { ItemInput, OrderInput } from "./data";
import { int, money, PortalError, text } from "./http";

export function toLeadInput(body: Record<string, unknown>): LeadInput {
  const value = money(body.estimatedValue);
  return {
    companyName: text(body.companyName, 200),
    contactName: text(body.contactName, 200),
    email: text(body.email, 200),
    phone: text(body.phone, 60),
    source: text(body.source, 120),
    estimatedValue: Number.isFinite(value) && value > 0 ? value : 0,
    owner: text(body.owner, 120),
    notes: text(body.notes, 2000),
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
    billingAddress: text(body.billingAddress, 500),
    shippingAddress: text(body.shippingAddress, 500),
    emails: emails.map((e) => text(e, 200)).filter(Boolean),
    phone: text(body.phone, 60),
    pointOfContact: text(body.pointOfContact, 200),
    salesRepId: salesRepId != null && Number.isFinite(salesRepId) ? salesRepId : null,
    subscribed: Boolean(body.subscribed),
    notes: text(body.notes, 2000),
  };
}

export function toItemInput(body: Record<string, unknown>): ItemInput {
  return {
    styleNumber: text(body.styleNumber, 80),
    styleName: text(body.styleName, 200),
    color: text(body.color, 80),
    size: text(body.size, 40),
    qty: int(body.qty),
    unitValue: money(body.unitValue),
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
