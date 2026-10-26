import { randomBytes } from "node:crypto";
import {
  FONTS,
  INK_COLORS,
  MAX_LAYERS,
  MAX_TEXT_LENGTH,
  type CustomDesign,
  type DesignLayer,
  type DesignProductOption,
  type GarmentPlaceholder,
} from "./design-constants";
import { db } from "./portal/db";
import { PortalError } from "./portal/http";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

// Unambiguous characters only (no 0/O/1/l/i), so a code is easy to read back over the phone.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function newCode(length = 7) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

const VALID_FONTS = new Set(FONTS.map((f) => f.family));
const VALID_COLORS = new Set(INK_COLORS.map((c) => c.hex));
const PLACEHOLDERS = new Set<GarmentPlaceholder>(["black-tee", "white-hoodie", "grey-crewneck"]);

function clampNum(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseLayersValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Trusts nothing from the client: every layer is rebuilt field by field from known-good values. */
function sanitizeLayers(value: unknown): DesignLayer[] {
  return parseLayersValue(value).slice(0, MAX_LAYERS).map((raw, i) => {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
      id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : `layer-${i}`,
      content: typeof r.content === "string" ? r.content.slice(0, MAX_TEXT_LENGTH) : "",
      fontFamily: typeof r.fontFamily === "string" && VALID_FONTS.has(r.fontFamily) ? r.fontFamily : FONTS[0].family,
      fontSize: clampNum(r.fontSize, 8, 160, 32),
      color: typeof r.color === "string" && VALID_COLORS.has(r.color) ? r.color : INK_COLORS[1].hex,
      bold: Boolean(r.bold),
      italic: Boolean(r.italic),
      x: clampNum(r.x, 0, 100, 50),
      y: clampNum(r.y, 0, 100, 50),
      rotation: clampNum(r.rotation, -180, 180, 0),
    };
  });
}

function sanitizeProductId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function asFkError(error: unknown) {
  return (error as { code?: string }).code === "23503" ? new PortalError("Choose a valid product.", 400) : error;
}

function toProductFromJoin(r: Row): DesignProductOption | null {
  if (r.product_id == null) return null;
  const placeholder = typeof r.product_placeholder === "string" && PLACEHOLDERS.has(r.product_placeholder as GarmentPlaceholder)
    ? (r.product_placeholder as GarmentPlaceholder)
    : null;
  return {
    id: num(r.product_id),
    label: str(r.product_label) || "Untitled product",
    imageUrl: str(r.product_image_url),
    placeholder,
    printArea: {
      left: num(r.print_left) || 37,
      top: num(r.print_top) || 28,
      width: num(r.print_width) || 26,
      height: num(r.print_height) || 38,
    },
  };
}

function toDesign(r: Row): CustomDesign {
  return {
    code: String(r.code),
    product: toProductFromJoin(r),
    layers: sanitizeLayers(r.layers),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function createDesign(productId: unknown, layers: unknown): Promise<string> {
  const sql = await db();
  const pid = sanitizeProductId(productId);
  if (!pid) throw new PortalError("Choose a product first.");
  const l = sanitizeLayers(layers);
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      try {
        await sql`insert into custom_designs (code, product_id, layers) values (${code}, ${pid}, ${sql.json(l)})`;
        return code;
      } catch (error) {
        if ((error as { code?: string }).code !== "23505") throw error;
      }
    }
  } catch (error) {
    throw asFkError(error);
  }
  throw new PortalError("Couldn't generate a design link. Try again.", 500);
}

export async function getDesignByCode(code: string): Promise<CustomDesign | null> {
  const sql = await db();
  const [row] = await sql`
    select
      cd.code, cd.layers, cd.created_at, cd.updated_at,
      dp.id as product_id, dp.label as product_label, dp.image_url as product_image_url,
      dp.placeholder as product_placeholder, dp.print_left, dp.print_top, dp.print_width, dp.print_height
    from custom_designs cd
    left join design_products dp on dp.id = cd.product_id
    where lower(cd.code) = ${code.toLowerCase()}`;
  return row ? toDesign(row) : null;
}

export async function updateDesign(code: string, productId: unknown, layers: unknown): Promise<void> {
  const sql = await db();
  const pid = sanitizeProductId(productId);
  if (!pid) throw new PortalError("Choose a product first.");
  const l = sanitizeLayers(layers);
  try {
    const rows = await sql`
      update custom_designs set product_id = ${pid}, layers = ${sql.json(l)}, updated_at = now()
      where lower(code) = ${code.toLowerCase()} returning id`;
    if (!rows.length) throw new PortalError("That design link no longer exists.", 404);
  } catch (error) {
    throw asFkError(error);
  }
}
