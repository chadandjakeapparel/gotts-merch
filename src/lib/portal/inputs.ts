import type { CustomerInput } from "./customers";
import type { ItemInput, OrderInput } from "./data";
import { int, money, PortalError, text } from "./http";
import type { JobInput } from "./jobs";
import { JOB_STATUSES } from "./jobs";
import type { LeadInput } from "./crm";

export function toJobInput(body: Record<string, unknown>): JobInput {
  const status = text(body.status, 20);
  return {
    title: text(body.title, 200),
    status: (JOB_STATUSES as string[]).includes(status) ? (status as JobInput["status"]) : "quote",
    contactName: text(body.contactName, 200),
    contactEmail: text(body.contactEmail, 200),
    notes: text(body.notes, 2000),
  };
}

export function toCustomerInput(body: Record<string, unknown>): CustomerInput {
  return {
    name: text(body.name, 200),
    company: text(body.company, 200),
    email: text(body.email, 200),
    phone: text(body.phone, 60),
    notes: text(body.notes, 1000),
  };
}

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
