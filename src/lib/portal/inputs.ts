import type { ItemInput, OrderInput } from "./data";
import { int, money, PortalError, text } from "./http";

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
