import { randomBytes } from "node:crypto";
import {
  FONTS,
  INK_COLORS,
  MAX_LAYERS,
  MAX_TEXT_LENGTH,
  PRODUCTS,
  type CustomDesign,
  type DesignLayer,
  type DesignProduct,
} from "./design-constants";
import { db } from "./portal/db";
import { PortalError } from "./portal/http";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

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
const VALID_PRODUCTS = new Set(PRODUCTS.map((p) => p.key));

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

function sanitizeProduct(value: unknown): DesignProduct {
  return typeof value === "string" && VALID_PRODUCTS.has(value as DesignProduct) ? (value as DesignProduct) : "black-tee";
}

function toDesign(r: Row): CustomDesign {
  return {
    code: String(r.code),
    product: sanitizeProduct(r.product),
    layers: sanitizeLayers(r.layers),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function createDesign(product: unknown, layers: unknown): Promise<string> {
  const sql = await db();
  const p = sanitizeProduct(product);
  const l = sanitizeLayers(layers);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await sql`insert into custom_designs (code, product, layers) values (${code}, ${p}, ${sql.json(l)})`;
      return code;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new PortalError("Couldn't generate a design link. Try again.", 500);
}

export async function getDesignByCode(code: string): Promise<CustomDesign | null> {
  const sql = await db();
  const [row] = await sql`select * from custom_designs where lower(code) = ${code.toLowerCase()}`;
  return row ? toDesign(row) : null;
}

export async function updateDesign(code: string, product: unknown, layers: unknown): Promise<void> {
  const sql = await db();
  const p = sanitizeProduct(product);
  const l = sanitizeLayers(layers);
  const rows = await sql`
    update custom_designs set product = ${p}, layers = ${sql.json(l)}, updated_at = now()
    where lower(code) = ${code.toLowerCase()} returning id`;
  if (!rows.length) throw new PortalError("That design link no longer exists.", 404);
}
