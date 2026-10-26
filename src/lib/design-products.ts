import type { DesignProductOption, GarmentPlaceholder } from "./design-constants";
import { db } from "./portal/db";
import { PortalError } from "./portal/http";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

const PLACEHOLDERS = new Set<GarmentPlaceholder>(["black-tee", "white-hoodie", "grey-crewneck"]);

function toPlaceholder(value: unknown): GarmentPlaceholder | null {
  return typeof value === "string" && PLACEHOLDERS.has(value as GarmentPlaceholder) ? (value as GarmentPlaceholder) : null;
}

function clampPct(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function toProduct(r: Row): DesignProductOption {
  return {
    id: num(r.id),
    label: str(r.label) || "Untitled product",
    imageUrl: str(r.image_url),
    placeholder: toPlaceholder(r.placeholder),
    printArea: {
      left: clampPct(r.print_left, 37),
      top: clampPct(r.print_top, 28),
      width: clampPct(r.print_width, 26),
      height: clampPct(r.print_height, 38),
    },
  };
}

export type AdminDesignProduct = DesignProductOption & { active: boolean; sortOrder: number };

function toAdminProduct(r: Row): AdminDesignProduct {
  return { ...toProduct(r), active: Boolean(r.active), sortOrder: num(r.sort_order) };
}

/** For the public designer: only products staff have switched on, in display order. */
export async function listActiveDesignProducts(): Promise<DesignProductOption[]> {
  const sql = await db();
  const rows = await sql`select * from design_products where active order by sort_order, id`;
  return rows.map(toProduct);
}

export async function getDesignProduct(id: number): Promise<DesignProductOption | null> {
  const sql = await db();
  const [row] = await sql`select * from design_products where id = ${id}`;
  return row ? toProduct(row) : null;
}

/** For /admin/designer-products: every product, active or not. */
export async function listAllDesignProducts(): Promise<AdminDesignProduct[]> {
  const sql = await db();
  const rows = await sql`select * from design_products order by sort_order, id`;
  return rows.map(toAdminProduct);
}

export type DesignProductInput = {
  label: string;
  imageUrl: string;
  placeholder: GarmentPlaceholder | null;
  printArea: { left: number; top: number; width: number; height: number };
  active: boolean;
};

function requireProduct(input: DesignProductInput) {
  if (!input.label.trim()) throw new PortalError("Give the product a name.");
  if (input.active && !input.imageUrl.trim() && !input.placeholder) {
    throw new PortalError("Upload a photo before turning this product on.");
  }
}

export async function createDesignProduct(input: DesignProductInput): Promise<number> {
  requireProduct(input);
  const sql = await db();
  const a = input.printArea;
  const [{ next }] = await sql`select coalesce(max(sort_order), 0) + 1 as next from design_products`;
  const [row] = await sql`
    insert into design_products (
      label, image_url, placeholder, print_left, print_top, print_width, print_height, active, sort_order
    ) values (
      ${input.label.trim()}, ${input.imageUrl.trim()}, ${input.placeholder}, ${clampPct(a.left, 37)},
      ${clampPct(a.top, 28)}, ${clampPct(a.width, 26)}, ${clampPct(a.height, 38)}, ${input.active}, ${num(next)}
    ) returning id`;
  return Number(row.id);
}

export async function updateDesignProduct(id: number, input: DesignProductInput): Promise<void> {
  requireProduct(input);
  const sql = await db();
  const a = input.printArea;
  const rows = await sql`
    update design_products set
      label = ${input.label.trim()}, image_url = ${input.imageUrl.trim()}, placeholder = ${input.placeholder},
      print_left = ${clampPct(a.left, 37)}, print_top = ${clampPct(a.top, 28)},
      print_width = ${clampPct(a.width, 26)}, print_height = ${clampPct(a.height, 38)},
      active = ${input.active}, updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That product no longer exists.", 404);
}

/** Leaves any saved customer designs alone -- their product link just goes blank (on delete set null). */
export async function deleteDesignProduct(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from design_products where id = ${id}`;
}

export async function reorderDesignProducts(orderedIds: number[]): Promise<void> {
  const sql = await db();
  await sql.begin(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx`update design_products set sort_order = ${i + 1} where id = ${orderedIds[i]}`;
    }
  });
}
