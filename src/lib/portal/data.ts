import type { Row as DbRow, TransactionSql } from "postgres";
import { db } from "./db";
import { PortalError } from "./http";
import type { Item, Order, OrderLine, PortalState, StockMove } from "./types";

type Tx = TransactionSql;
type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

function toItem(r: Row): Item {
  return {
    id: num(r.id),
    styleNumber: str(r.style_number),
    styleName: str(r.style_name),
    color: str(r.color),
    qty: num(r.qty),
    unitValue: num(r.unit_value),
    committed: num(r.committed),
    updatedAt: iso(r.updated_at) || "",
  };
}

function toLine(r: Row): OrderLine {
  return {
    id: num(r.id),
    itemId: r.item_id == null ? null : num(r.item_id),
    styleNumber: str(r.style_number),
    styleName: str(r.style_name),
    color: str(r.color),
    qty: num(r.qty),
    unitValue: num(r.unit_value),
    rawText: str(r.raw_text),
  };
}

function toOrder(r: Row, lines: OrderLine[]): Order {
  return {
    id: num(r.id),
    source: r.source === "jotform" ? "jotform" : "manual",
    ref: str(r.ref),
    customerName: str(r.customer_name),
    shipTo: str(r.ship_to),
    email: str(r.email),
    notes: str(r.notes),
    status: r.status as Order["status"],
    needsReview: Boolean(r.needs_review),
    carrier: str(r.carrier),
    tracking: str(r.tracking),
    createdAt: iso(r.created_at) || "",
    fulfilledAt: iso(r.fulfilled_at),
    shippedAt: iso(r.shipped_at),
    cancelledAt: iso(r.cancelled_at),
    lines,
  };
}

function toMove(r: Row): StockMove {
  return {
    id: num(r.id),
    kind: r.kind as StockMove["kind"],
    itemId: r.item_id == null ? null : num(r.item_id),
    orderId: r.order_id == null ? null : num(r.order_id),
    qtyDelta: num(r.qty_delta),
    label: str(r.label),
    ref: str(r.ref),
    note: str(r.note),
    createdAt: iso(r.created_at) || "",
  };
}

const label = (r: { style_number?: unknown; color?: unknown }) =>
  `${str(r.style_number)} ${str(r.color)}`.trim();

// ---------- reads ----------

export async function getState(clientId: number): Promise<PortalState> {
  const sql = await db();
  const [items, orders, lines, moves] = await Promise.all([
    sql`
      select i.*, coalesce(c.committed, 0) as committed
      from items i
      left join (
        select l.item_id, sum(l.qty) as committed
        from order_lines l join orders o on o.id = l.order_id
        where o.status = 'open' and o.client_id = ${clientId} and l.item_id is not null
        group by l.item_id
      ) c on c.item_id = i.id
      where i.client_id = ${clientId}
      order by lower(i.style_number), lower(i.color)`,
    sql`select * from orders where client_id = ${clientId} order by created_at desc limit 300`,
    sql`
      select l.* from order_lines l
      where l.order_id in (select id from orders where client_id = ${clientId} order by created_at desc limit 300)
      order by l.id`,
    sql`select * from stock_moves where client_id = ${clientId} order by created_at desc, id desc limit 300`,
  ]);
  const byOrder = new Map<number, OrderLine[]>();
  for (const r of lines) {
    const line = toLine(r);
    const id = num(r.order_id);
    byOrder.set(id, [...(byOrder.get(id) || []), line]);
  }
  return {
    items: items.map(toItem),
    orders: orders.map((r) => toOrder(r, byOrder.get(num(r.id)) || [])),
    moves: moves.map(toMove),
  };
}

// ---------- items ----------

export type ItemInput = {
  styleNumber: string;
  styleName: string;
  color: string;
  qty: number;
  unitValue: number;
};

function checkItem(rec: ItemInput) {
  if (!rec.styleNumber || !rec.color) throw new PortalError("Style # and color are required.");
  if (!Number.isInteger(rec.qty) || rec.qty < 0) throw new PortalError("Quantity must be a whole number, 0 or more.");
  if (!Number.isFinite(rec.unitValue) || rec.unitValue < 0) throw new PortalError("Unit value must be a dollar amount, 0 or more.");
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string })?.code === "23505";
}

export async function createItem(clientId: number, rec: ItemInput) {
  checkItem(rec);
  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into items (client_id, style_number, style_name, color, qty, unit_value)
        values (${clientId}, ${rec.styleNumber}, ${rec.styleName || rec.styleNumber}, ${rec.color}, ${rec.qty}, ${rec.unitValue})
        returning *`;
      await tx`
        insert into stock_moves (client_id, kind, item_id, qty_delta, label)
        values (${clientId}, 'added', ${row.id}, ${rec.qty}, ${label(row)})`;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PortalError(`${rec.styleNumber} in ${rec.color} is already listed. Edit that line or receive stock into it.`, 409);
    }
    throw error;
  }
}

export async function importItems(clientId: number, rows: ItemInput[]) {
  if (!rows.length) throw new PortalError("There are no rows to import.");
  if (rows.length > 2000) throw new PortalError("Import up to 2,000 rows at a time.");
  rows.forEach(checkItem);
  const sql = await db();
  let created = 0;
  let updated = 0;
  await sql.begin(async (tx) => {
    for (const rec of rows) {
      const [row] = await tx`
        insert into items (client_id, style_number, style_name, color, qty, unit_value)
        values (${clientId}, ${rec.styleNumber}, ${rec.styleName || rec.styleNumber}, ${rec.color}, ${rec.qty}, ${rec.unitValue})
        on conflict (client_id, (lower(style_number)), (lower(color))) do update set
          style_name = case when ${rec.styleName} <> '' then ${rec.styleName} else items.style_name end,
          qty = excluded.qty,
          unit_value = excluded.unit_value,
          updated_at = now()
        returning (xmax = 0) as inserted`;
      if (row.inserted) created++;
      else updated++;
    }
    await tx`
      insert into stock_moves (client_id, kind, label, note)
      values (${clientId}, 'imported', ${`${rows.length} ${rows.length === 1 ? "line" : "lines"}`}, ${`${created} new, ${updated} updated`})`;
  });
  return { created, updated };
}

export async function updateItem(clientId: number, id: number, rec: ItemInput) {
  checkItem(rec);
  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx`select * from items where id = ${id} and client_id = ${clientId} for update`;
      if (!before) throw new PortalError("That line no longer exists.", 404);
      const [after] = await tx`
        update items set style_number = ${rec.styleNumber}, style_name = ${rec.styleName}, color = ${rec.color},
          qty = ${rec.qty}, unit_value = ${rec.unitValue}, updated_at = now()
        where id = ${id} returning *`;
      const delta = rec.qty - num(before.qty);
      if (delta !== 0) {
        await tx`
          insert into stock_moves (client_id, kind, item_id, qty_delta, label, note)
          values (${clientId}, 'adjusted', ${id}, ${delta}, ${label(after)}, ${`Count changed from ${num(before.qty)} to ${rec.qty}`})`;
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PortalError(`${rec.styleNumber} in ${rec.color} is already another line.`, 409);
    }
    throw error;
  }
}

export async function deleteItem(clientId: number, id: number) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx`select * from items where id = ${id} and client_id = ${clientId} for update`;
    if (!row) return;
    const [open] = await tx`
      select count(*)::int as n from order_lines l join orders o on o.id = l.order_id
      where l.item_id = ${id} and o.status = 'open'`;
    if (open.n > 0) {
      throw new PortalError(`${label(row)} is on ${open.n} open order line${open.n === 1 ? "" : "s"}. Fulfill or cancel those orders first.`, 409);
    }
    await tx`
      insert into stock_moves (client_id, kind, qty_delta, label, note)
      values (${clientId}, 'deleted', ${-num(row.qty)}, ${label(row)}, 'Line removed from inventory')`;
    await tx`delete from items where id = ${id}`;
  });
}

export async function receiveStock(clientId: number, input: {
  ref: string;
  note: string;
  lines: { itemId: number; qty: number }[];
}) {
  if (!input.lines.length) throw new PortalError("Add at least one style and quantity.");
  const sql = await db();
  await sql.begin(async (tx) => {
    for (const line of input.lines) {
      if (!(line.qty > 0)) throw new PortalError("Every line needs a quantity of 1 or more.");
      const [row] = await tx`
        update items set qty = qty + ${line.qty}, updated_at = now()
        where id = ${line.itemId} and client_id = ${clientId} returning *`;
      if (!row) throw new PortalError("One of those styles no longer exists. Reload and try again.", 404);
      await tx`
        insert into stock_moves (client_id, kind, item_id, qty_delta, label, ref, note)
        values (${clientId}, 'received', ${row.id}, ${line.qty}, ${label(row)}, ${input.ref}, ${input.note})`;
    }
  });
}

// ---------- orders ----------

export type LineInput = {
  itemId: number | null;
  qty: number;
  styleNumber?: string;
  styleName?: string;
  color?: string;
  rawText?: string;
};

export type OrderInput = {
  ref: string;
  customerName: string;
  shipTo: string;
  email: string;
  notes: string;
  lines: LineInput[];
};

async function writeLines(tx: Tx, clientId: number, orderId: number, lines: LineInput[]) {
  const ids = [...new Set(lines.map((l) => l.itemId).filter((v): v is number => v != null))];
  const items = ids.length ? await tx`select * from items where client_id = ${clientId} and id in ${tx(ids)}` : [];
  const byId = new Map(items.map((r) => [num(r.id), r]));
  let unmatched = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty < 0) throw new PortalError("Quantities must be whole numbers.");
    const item = line.itemId != null ? byId.get(line.itemId) : undefined;
    if (line.itemId != null && !item) throw new PortalError("One of those styles no longer exists. Reload and try again.", 404);
    if (!item || line.qty === 0) unmatched++;
    await tx`
      insert into order_lines (order_id, item_id, style_number, style_name, color, qty, unit_value, raw_text)
      values (
        ${orderId}, ${item ? item.id : null},
        ${item ? item.style_number : line.styleNumber || ""},
        ${item ? item.style_name : line.styleName || ""},
        ${item ? item.color : line.color || ""},
        ${line.qty}, ${item ? item.unit_value : 0}, ${line.rawText || ""})`;
  }
  return unmatched;
}

export async function createOrder(
  clientId: number,
  input: OrderInput,
  meta: { source?: "manual" | "jotform"; externalId?: string; raw?: unknown; fulfillNow?: boolean } = {},
) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [order] = await tx`
      insert into orders (client_id, source, external_id, ref, customer_name, ship_to, email, notes, raw)
      values (${clientId}, ${meta.source || "manual"}, ${meta.externalId || null}, ${input.ref}, ${input.customerName},
        ${input.shipTo}, ${input.email}, ${input.notes}, ${meta.raw ? tx.json(meta.raw as never) : null})
      on conflict (external_id) do nothing
      returning *`;
    if (!order) return { id: null as number | null, duplicate: true, needsReview: false };
    const unmatched = await writeLines(tx, clientId, order.id, input.lines);
    const needsReview = unmatched > 0 || input.lines.length === 0;
    if (needsReview) await tx`update orders set needs_review = true where id = ${order.id}`;
    // Fulfilling in the same transaction means a short order saves nothing.
    if (meta.fulfillNow) await fulfillInTx(tx, order);
    return { id: num(order.id) as number | null, duplicate: false, needsReview };
  });
}

async function lockOrder(tx: Tx, clientId: number, id: number) {
  const [order] = await tx`select * from orders where id = ${id} and client_id = ${clientId} for update`;
  if (!order) throw new PortalError("That order no longer exists.", 404);
  return order;
}

export async function updateOrder(clientId: number, id: number, input: OrderInput) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const order = await lockOrder(tx, clientId, id);
    if (order.status !== "open") {
      throw new PortalError("Only orders that haven't been fulfilled can be changed.", 409);
    }
    await tx`
      update orders set ref = ${input.ref}, customer_name = ${input.customerName}, ship_to = ${input.shipTo},
        email = ${input.email}, notes = ${input.notes}
      where id = ${id}`;
    await tx`delete from order_lines where order_id = ${id}`;
    const unmatched = await writeLines(tx, clientId, id, input.lines);
    await tx`update orders set needs_review = ${unmatched > 0 || input.lines.length === 0} where id = ${id}`;
  });
}

async function fulfillInTx(tx: Tx, order: DbRow) {
  const lines = await tx`select * from order_lines where order_id = ${order.id}`;
  const live = lines.filter((l) => num(l.qty) > 0);
  if (!live.length) throw new PortalError("This order has no quantities to fulfill. Edit the order first.", 409);
  if (live.some((l) => l.item_id == null)) {
    throw new PortalError("Some lines aren't matched to a style in inventory. Edit the order and pick a style for each line.", 409);
  }
  const need = new Map<number, number>();
  for (const l of live) need.set(num(l.item_id), (need.get(num(l.item_id)) || 0) + num(l.qty));
  const items = await tx`select * from items where client_id = ${order.client_id} and id in ${tx([...need.keys()])} for update`;
  if (items.length !== need.size) throw new PortalError("A style on this order was deleted from inventory. Edit the order first.", 409);
  const short = items.filter((r) => num(r.qty) < (need.get(num(r.id)) || 0));
  if (short.length) {
    const list = short.map((r) => `${label(r)} (${num(r.qty)} on hand, needs ${need.get(num(r.id))})`).join("; ");
    throw new PortalError(`Not enough stock: ${list}. Receive more stock or lower the order quantity.`, 409);
  }
  for (const r of items) {
    const q = need.get(num(r.id)) || 0;
    await tx`update items set qty = qty - ${q}, updated_at = now() where id = ${r.id}`;
    await tx`
      insert into stock_moves (client_id, kind, item_id, order_id, qty_delta, label, ref)
      values (${order.client_id}, 'fulfilled', ${r.id}, ${order.id}, ${-q}, ${label(r)}, ${str(order.ref)})`;
  }
  await tx`update orders set status = 'fulfilled', fulfilled_at = now(), needs_review = false where id = ${order.id}`;
}

export async function fulfillOrder(clientId: number, id: number) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const order = await lockOrder(tx, clientId, id);
    if (order.status !== "open") throw new PortalError("This order has already been fulfilled or cancelled.", 409);
    await fulfillInTx(tx, order);
  });
}

/** Marks an order shipped, fulfilling it first if needed. Also edits tracking on a shipped order. */
export async function shipOrder(clientId: number, id: number, carrier: string, tracking: string) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const order = await lockOrder(tx, clientId, id);
    if (order.status === "cancelled") throw new PortalError("A cancelled order can't be shipped.", 409);
    if (order.status === "open") await fulfillInTx(tx, order);
    await tx`
      update orders set status = 'shipped', carrier = ${carrier}, tracking = ${tracking},
        shipped_at = coalesce(shipped_at, now())
      where id = ${id}`;
  });
}

export async function cancelOrder(clientId: number, id: number) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const order = await lockOrder(tx, clientId, id);
    if (order.status === "cancelled") return;
    if (order.status === "shipped") {
      throw new PortalError("A shipped order can't be cancelled. Use Receive stock if the goods come back.", 409);
    }
    if (order.status === "fulfilled") {
      const lines = await tx`
        select l.item_id, sum(l.qty)::int as q, i.style_number, i.color
        from order_lines l join items i on i.id = l.item_id
        where l.order_id = ${id} and l.qty > 0
        group by l.item_id, i.style_number, i.color`;
      for (const l of lines) {
        await tx`update items set qty = qty + ${l.q}, updated_at = now() where id = ${l.item_id}`;
        await tx`
          insert into stock_moves (client_id, kind, item_id, order_id, qty_delta, label, ref, note)
          values (${clientId}, 'restored', ${l.item_id}, ${id}, ${l.q}, ${label(l)}, ${str(order.ref)}, 'Order cancelled')`;
      }
    }
    await tx`update orders set status = 'cancelled', cancelled_at = now() where id = ${id}`;
  });
}

export async function findItemsForMatching(clientId: number) {
  const sql = await db();
  const rows = await sql`select id, style_number, style_name, color from items where client_id = ${clientId}`;
  return rows.map((r) => ({
    id: num(r.id),
    styleNumber: str(r.style_number),
    styleName: str(r.style_name),
    color: str(r.color),
  }));
}
