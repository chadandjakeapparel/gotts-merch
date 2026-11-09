import type { TransactionSql } from "postgres";
import { db } from "./db";
import { createFolder, deleteFolderFile, toFile } from "./files";
import { PortalError } from "./http";
import type { FolderFile, PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

/** The number staff and vendors see -- the stored po_number is a plain sequential integer; "GM" is a display-only prefix. Mirrors the client-side poLabel() in purchase-orders-app.tsx. */
function poLabel(poNumber: number) {
  return `GM${poNumber}`;
}

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

function toPurchaseOrder(r: Row, lines: PurchaseOrderLine[], jobIds: number[], files: FolderFile[]): PurchaseOrder {
  return {
    id: num(r.id),
    poNumber: num(r.po_number),
    vendorId: r.vendor_id == null ? null : num(r.vendor_id),
    jobIds,
    status: r.status as PurchaseOrderStatus,
    notes: str(r.notes),
    lines,
    folderId: r.folder_id == null ? null : num(r.folder_id),
    files,
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const sql = await db();
  const [orders, lines, jobLinks] = await Promise.all([
    sql`select * from purchase_orders order by po_number desc`,
    sql`select * from purchase_order_lines order by purchase_order_id, sort_order`,
    sql`select * from purchase_order_jobs order by purchase_order_id, job_id`,
  ]);
  const linesByOrder = new Map<number, PurchaseOrderLine[]>();
  for (const r of lines) {
    const id = Number(r.purchase_order_id);
    linesByOrder.set(id, [...(linesByOrder.get(id) || []), toLine(r)]);
  }
  const jobIdsByOrder = new Map<number, number[]>();
  for (const r of jobLinks) {
    const id = Number(r.purchase_order_id);
    jobIdsByOrder.set(id, [...(jobIdsByOrder.get(id) || []), Number(r.job_id)]);
  }
  const folderIds = [...new Set(orders.map((r) => r.folder_id).filter((v) => v != null).map(Number))];
  const files = folderIds.length ? await sql`select * from folder_files where folder_id in ${sql(folderIds)} order by created_at desc` : [];
  const filesByFolder = new Map<number, FolderFile[]>();
  for (const r of files) {
    const id = Number(r.folder_id);
    filesByFolder.set(id, [...(filesByFolder.get(id) || []), toFile(r)]);
  }
  return orders.map((r) =>
    toPurchaseOrder(
      r,
      linesByOrder.get(Number(r.id)) || [],
      jobIdsByOrder.get(Number(r.id)) || [],
      r.folder_id == null ? [] : filesByFolder.get(Number(r.folder_id)) || [],
    ),
  );
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder | null> {
  const sql = await db();
  const [[row], lines, jobLinks] = await Promise.all([
    sql`select * from purchase_orders where id = ${id}`,
    sql`select * from purchase_order_lines where purchase_order_id = ${id} order by sort_order`,
    sql`select job_id from purchase_order_jobs where purchase_order_id = ${id} order by job_id`,
  ]);
  if (!row) return null;
  const files =
    row.folder_id == null ? [] : (await sql`select * from folder_files where folder_id = ${row.folder_id} order by created_at desc`).map(toFile);
  return toPurchaseOrder(row, lines.map(toLine), jobLinks.map((r) => Number(r.job_id)), files);
}

/** Finds the folder named `name` directly under `parentFolderId` (or at the root when null), creating it if it doesn't exist yet. */
async function findOrCreateFolder(
  sql: Awaited<ReturnType<typeof db>>,
  name: string,
  parentFolderId: number | null,
  createdBy: string,
): Promise<number> {
  const [existing] =
    parentFolderId == null
      ? await sql`select id from file_folders where name = ${name} and parent_folder_id is null`
      : await sql`select id from file_folders where name = ${name} and parent_folder_id = ${parentFolderId}`;
  if (existing) return Number(existing.id);
  return createFolder(name, createdBy, parentFolderId);
}

const PURCHASE_ORDER_ROOT_FOLDER_NAME = "Purchase Order";

/**
 * Lazily creates (only on a PO's first document upload) the Files folder its documents live in --
 * a shared "Purchase Order" folder at the root, then a "PO #GM<n>" subfolder for this specific PO --
 * and remembers it on the purchase order row so every later upload reuses the same folder.
 */
export async function ensurePurchaseOrderFolder(id: number, createdBy: string): Promise<number> {
  const sql = await db();
  const [po] = await sql`select folder_id, po_number from purchase_orders where id = ${id}`;
  if (!po) throw new PortalError("That purchase order no longer exists.", 404);
  if (po.folder_id != null) return Number(po.folder_id);

  const rootId = await findOrCreateFolder(sql, PURCHASE_ORDER_ROOT_FOLDER_NAME, null, createdBy);
  const folderId = await findOrCreateFolder(sql, `PO #${poLabel(num(po.po_number))}`, rootId, createdBy);
  await sql`update purchase_orders set folder_id = ${folderId} where id = ${id}`;
  return folderId;
}

/** Resolves a PO's own folder, then deletes the file from it -- so staff can't delete a file via a PO id that isn't actually that file's folder. */
export async function deletePurchaseOrderFile(id: number, fileId: number): Promise<void> {
  const sql = await db();
  const [po] = await sql`select folder_id from purchase_orders where id = ${id}`;
  if (!po || po.folder_id == null) return;
  await deleteFolderFile(Number(po.folder_id), fileId);
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
  /** The jobs/sales orders this purchase order covers -- can be more than one when goods are ordered together. */
  jobIds: number[];
  status: PurchaseOrderStatus;
  notes: string;
  lines: PurchaseOrderLineInput[];
};

function requirePurchaseOrder(input: PurchaseOrderInput) {
  if (!input.vendorId) throw new PortalError("Choose a vendor for this purchase order.");
}

function asFkError(error: unknown) {
  if ((error as { code?: string }).code !== "23503") return error;
  return new PortalError("Choose a valid vendor and job(s).", 400);
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

async function replaceJobs(tx: TransactionSql, purchaseOrderId: number, jobIds: number[]) {
  await tx`delete from purchase_order_jobs where purchase_order_id = ${purchaseOrderId}`;
  const unique = [...new Set(jobIds)];
  for (const jobId of unique) {
    await tx`insert into purchase_order_jobs (purchase_order_id, job_id) values (${purchaseOrderId}, ${jobId})`;
  }
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<number> {
  requirePurchaseOrder(input);
  const sql = await db();
  try {
    return await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into purchase_orders (po_number, vendor_id, status, notes)
        values (nextval('purchase_order_number_seq'), ${input.vendorId}, ${input.status}, ${input.notes})
        returning id`;
      const id = Number(row.id);
      await replaceLines(tx, id, input.lines);
      await replaceJobs(tx, id, input.jobIds);
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
          vendor_id = ${input.vendorId}, status = ${input.status}, notes = ${input.notes}, updated_at = now()
        where id = ${id} returning id`;
      if (!rows.length) throw new PortalError("That purchase order no longer exists.", 404);
      await replaceLines(tx, id, input.lines);
      await replaceJobs(tx, id, input.jobIds);
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from purchase_orders where id = ${id}`;
}
