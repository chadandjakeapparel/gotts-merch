import type { LineInput, OrderInput } from "./data";

type MatchItem = { id: number; styleNumber: string; styleName: string; color: string; size: string };

/**
 * Turns a JotForm submission into an order.
 *
 * JotForm posts `rawRequest`, a JSON object keyed like `q3_poNumber`. Fields are
 * recognised by their names, so the form works as long as its fields are named
 * sensibly (PO number, ship to, style #, color, quantity...). Line items can come
 * from a Configurable List or Input Table widget, from numbered fields
 * (Style # 1, Color 1, Quantity 1...), or from a free-text "items" box. Anything
 * that cannot be matched to inventory is kept as text and the order is flagged
 * for review.
 */
export function parseSubmission(
  raw: Record<string, unknown>,
  items: MatchItem[],
): OrderInput {
  const fields: { name: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const m = key.match(/^q\d+_(.+)$/);
    if (!m) continue;
    fields.push({ name: words(m[1]), value });
  }

  const pick = (re: RegExp, exclude?: RegExp) =>
    fields.find((f) => re.test(f.name) && !(exclude && exclude.test(f.name)) && flat(f.value));

  const ref = flat(pick(/\b(po|purchase order|order (number|no|id|#)|order)\b/, /item|line|qty|quantity|style|date|detail|product|note|status|type|method/)?.value);
  const customerName = flat(pick(/\b(company|customer|store|account|name|full name)\b/, /style|item|product|ship|email/)?.value);
  const shipTo = flat(pick(/\b(ship|shipping|address|deliver)\b/, /method|date|email/)?.value, ", ");
  const email = flat(pick(/\be ?mail\b/)?.value);
  const notes = [
    flat(pick(/\b(notes?|instructions?|comments?|message|special)\b/)?.value),
    flat(pick(/\b(ship(ping)? method|carrier|need by|due|in hands|ship date)\b/)?.value),
  ].filter(Boolean).join(" · ");

  const lines = extractLines(fields).map((line) => matchLine(line, items)).filter((l) => l.qty > 0 || l.rawText);

  return { ref, customerName, shipTo, email, notes, lines };
}

// ---------- line extraction ----------

type RawLine = { styleNumber: string; color: string; size: string; styleName: string; qty: number; rawText: string };

const STYLE_KEY = /(style|sku|item|product)\s*(#|no|num|number|code)?$|^(style|sku)/;
const COLOR_KEY = /colou?r/;
const SIZE_KEY = /\bsizes?\b/;
const QTY_KEY = /qty|quantity|units|count|amount|pcs|pieces/;
const NAME_KEY = /name|description|desc/;

function rowFromObject(obj: Record<string, unknown>): RawLine | null {
  const row: RawLine = { styleNumber: "", color: "", size: "", styleName: "", qty: 0, rawText: "" };
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = words(k);
    const value = flat(v);
    if (!value) continue;
    parts.push(`${k}: ${value}`);
    if (COLOR_KEY.test(key)) row.color ||= value;
    else if (SIZE_KEY.test(key)) row.size ||= value;
    else if (QTY_KEY.test(key)) row.qty ||= toQty(value);
    else if (STYLE_KEY.test(key) && !NAME_KEY.test(key)) row.styleNumber ||= value;
    else if (NAME_KEY.test(key) || /style/.test(key)) row.styleName ||= value;
  }
  if (!parts.length) return null;
  row.rawText = parts.join(", ");
  return row;
}

function tableRows(value: unknown): RawLine[] | null {
  let v = value;
  if (typeof v === "string" && /^\s*[[{]/.test(v)) {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (Array.isArray(v) && v.length && v.every((r) => r && typeof r === "object")) {
    return v.map((r) => rowFromObject(r as Record<string, unknown>)).filter((r): r is RawLine => !!r);
  }
  // Input Table: { "Row label": { "Column": value } }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length && entries.every(([, r]) => r && typeof r === "object" && !Array.isArray(r))) {
      return entries
        .map(([rowLabel, r]) => {
          const row = rowFromObject(r as Record<string, unknown>);
          if (row && !row.styleNumber && !/^\d+$/.test(rowLabel)) row.styleNumber = rowLabel;
          if (row) row.rawText = `${rowLabel}: ${row.rawText}`;
          return row;
        })
        .filter((r): r is RawLine => !!r);
    }
  }
  return null;
}

function extractLines(fields: { name: string; value: unknown }[]): RawLine[] {
  // 1. Configurable List / Input Table widgets.
  const tables: RawLine[] = [];
  for (const f of fields) {
    const rows = tableRows(f.value);
    if (rows && rows.some((r) => r.qty > 0 || r.styleNumber)) tables.push(...rows);
  }
  if (tables.length) return tables;

  // 2. Numbered fields: "style number 1", "color 1", "quantity 1"...
  const groups = new Map<string, Record<string, unknown>>();
  for (const f of fields) {
    const m = f.name.match(/^(.*?)\s*(\d+)$/);
    if (!m || !(STYLE_KEY.test(m[1]) || COLOR_KEY.test(m[1]) || SIZE_KEY.test(m[1]) || QTY_KEY.test(m[1]) || NAME_KEY.test(m[1]))) continue;
    const g = groups.get(m[2]) || {};
    g[m[1]] = f.value;
    groups.set(m[2], g);
  }
  if (groups.size) {
    return [...groups.keys()]
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => rowFromObject(groups.get(k)!))
      .filter((r): r is RawLine => !!r && (r.qty > 0 || !!r.styleNumber));
  }

  // 3. A single style / color / quantity set of fields.
  const single = rowFromObject(
    Object.fromEntries(
      fields
        .filter((f) => STYLE_KEY.test(f.name) || COLOR_KEY.test(f.name) || SIZE_KEY.test(f.name) || QTY_KEY.test(f.name))
        .map((f) => [f.name, f.value]),
    ),
  );
  if (single && single.styleNumber && single.qty > 0) return [single];

  // 4. Free text: one line per row of an "items" / "order details" box.
  const box = fields.find((f) => /\b(items?|products?|styles?|order details|lines?|what)\b/.test(f.name) && typeof f.value === "string");
  if (box) {
    return String(box.value)
      .split(/\r?\n|;/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ styleNumber: "", color: "", size: "", styleName: "", qty: 0, rawText: t }));
  }
  return [];
}

// ---------- matching ----------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function matchLine(line: RawLine, items: MatchItem[]): LineInput {
  let candidates: MatchItem[] = [];
  const text = norm(line.rawText);
  if (line.styleNumber) {
    candidates = items.filter((i) => norm(i.styleNumber) === norm(line.styleNumber));
  } else if (text) {
    candidates = items.filter((i) => ` ${text} `.includes(` ${norm(i.styleNumber)} `));
  }
  if (candidates.length > 1) {
    const color = norm(line.color);
    const byColor = color
      ? candidates.filter((i) => norm(i.color) === color)
      : candidates.filter((i) => ` ${text} `.includes(` ${norm(i.color)} `));
    candidates = byColor.length ? byColor : candidates;
  } else if (candidates.length === 1 && line.color && norm(candidates[0].color) !== norm(line.color)) {
    candidates = [];
  }

  if (candidates.length > 1) {
    const size = norm(line.size);
    const bySize = size
      ? candidates.filter((i) => norm(i.size) === size)
      : candidates.filter((i) => ` ${text} `.includes(` ${norm(i.size)} `));
    candidates = bySize.length ? bySize : candidates;
  } else if (candidates.length === 1 && line.size && norm(candidates[0].size) !== norm(line.size)) {
    candidates = [];
  }

  let qty = line.qty;
  if (!qty && line.rawText) {
    const explicit = line.rawText.match(/(?:qty|quantity|units|pcs|x|×)\s*[:=]?\s*(\d{1,6})\b/i) ||
      line.rawText.match(/\b(\d{1,6})\s*(?:pcs|pieces|units|ea)\b/i);
    if (explicit) qty = Number(explicit[1]);
    else if (candidates.length === 1) {
      const style = norm(candidates[0].styleNumber);
      const nums = norm(line.rawText).replace(` ${style} `, " ").split(" ").filter((t) => /^\d{1,6}$/.test(t));
      if (nums.length) qty = Number(nums[nums.length - 1]);
    }
  }

  const item = candidates.length === 1 ? candidates[0] : null;
  return {
    itemId: item ? item.id : null,
    qty: Number.isFinite(qty) ? qty : 0,
    styleNumber: item ? item.styleNumber : line.styleNumber,
    styleName: item ? item.styleName : line.styleName,
    color: item ? item.color : line.color,
    size: item ? item.size : line.size,
    rawText: line.rawText || [line.styleNumber, line.styleName, line.color, line.size, line.qty ? `qty ${line.qty}` : ""].filter(Boolean).join(" · "),
  };
}

// ---------- helpers ----------

/** "q12_poNumber" → "po number"; "shipTo" → "ship to". */
function words(key: string) {
  return key
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toQty(value: string) {
  const n = parseInt(value.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Flattens JotForm values (name/address objects, arrays) to a string. */
function flat(value: unknown, sep = " "): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((v) => flat(v, sep)).filter(Boolean).join(sep);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("first" in o || "last" in o) return [o.prefix, o.first, o.middle, o.last].map((v) => flat(v)).filter(Boolean).join(" ");
    if ("addr_line1" in o) {
      const cityLine = [flat(o.city), [flat(o.state), flat(o.postal)].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      return [o.addr_line1, o.addr_line2].map((v) => flat(v)).concat(cityLine, flat(o.country)).filter(Boolean).join(sep);
    }
    if ("full" in o) return flat(o.full);
    return Object.values(o).map((v) => flat(v, sep)).filter(Boolean).join(sep);
  }
  return "";
}
