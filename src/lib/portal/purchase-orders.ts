import type { TransactionSql } from "postgres";
import { db } from "./db";
import { PortalError } from "./http";
import type { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

export const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ["draft", "sent", "received", "cancelled"];
export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  cancelled: "Cancelled",
};

function toLine(r: Row): PurchaseOrderLine {
  return {
    id: num(r.id),
    itemName: str(r.item_name),
    description: str(r.description),
    color: str(r.color),
    size: str(r.size),
    quantity: num(r.quantity),
    unitCost: num(r.unit_cost),
  };
}

function toPurchaseOrder(r: Row, lines: PurchaseOrderLine[]): PurchaseOrder {
  return {
    id: num(r.id),
    poNumber: num(r.po_number),
    vendorId: r.vendor_id == null ? null : num(r.vendor_id),
    jobId: r.job_id == null ? null : num(r.job_id),
    status: r.status as PurchaseOrderStatus,
    notes: str(r.notes),
    lines,
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const sql = await db();
  const [orders, lines] = await Promise.all([
    sql`select * from purchase_orders order by po_number desc`,
    sql`select * from purchase_order_lines order by purchase_order_id, sort_order`,
  ]);
  const linesByOrder = new Map<number, PurchaseOrderLine[]>();
  for (const r of lines) {
    const id = Number(r.purchase_order_id);
    linesByOrder.set(id, [...(linesByOrder.get(id) || []), toLine(r)]);
  }
  return orders.map((r) => toPurchaseOrder(r, linesByOrder.get(Number(r.id)) || []));
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder | null> {
  const sql = await db();
  const [[row], lines] = await Promise.all([
    sql`select * from purchase_orders where id = ${id}`,
    sql`select * from purchase_order_lines where purchase_order_id = ${id} order by sort_order`,
  ]);
  return row ? toPurchaseOrder(row, lines.map(toLine)) : null;
}

export type PurchaseOrderLineInput = {
  itemName: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderInput = {
  vendorId: number | null;
  jobId: number | null;
  status: PurchaseOrderStatus;
  notes: string;
  lines: PurchaseOrderLineInput[];
};

function requirePurchaseOrder(input: PurchaseOrderInput) {
  if (!input.vendorId) throw new PortalError("Choose a vendor for this purchase order.");
}

function asFkError(error: unknown) {
  if ((error as { code?: string }).code !== "23503") return error;
  return new PortalError("Choose a valid vendor and job.", 400);
}

async function replaceLines(tx: TransactionSql, purchaseOrderId: number, lines: PurchaseOrderLineInput[]) {
  await tx`delete from purchase_order_lines where purchase_order_id = ${purchaseOrderId}`;
  let sortOrder = 0;
  for (const li of lines) {
    await tx`
      insert into purchase_order_lines (purchase_order_id, item_name, description, color, size, quantity, unit_cost, sort_order)
      values (${purchaseOrderId}, ${li.itemName}, ${li.description}, ${li.color}, ${li.size}, ${li.quantity}, ${li.unitCost}, ${sortOrder++})`;
  }
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<number> {
  requirePurchaseOrder(input);
  const sql = await db();
  try {
    return await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into purchase_orders (po_number, vendor_id, job_id, status, notes)
        values (nextval('purchase_order_number_seq'), ${input.vendorId}, ${input.jobId}, ${input.status}, ${input.notes})
        returning id`;
      const id = Number(row.id);
      await replaceLines(tx, id, input.lines);
      return id;
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function updatePurchaseOrder(id: number, input: PurchaseOrderInput): Promise<void> {
  requirePurchaseOrder(input);
  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx`
        update purchase_orders set
          vendor_id = ${input.vendorId}, job_id = ${input.jobId}, status = ${input.status}, notes = ${input.notes},
          updated_at = now()
        where id = ${id} returning id`;
      if (!rows.length) throw new PortalError("That purchase order no longer exists.", 404);
      await replaceLines(tx, id, input.lines);
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from purchase_orders where id = ${id}`;
}
