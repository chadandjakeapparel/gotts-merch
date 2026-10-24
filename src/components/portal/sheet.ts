export type SheetRow = { styleNumber: string; styleName: string; color: string; size: string; qty: number; unitValue: number };

/** Splits pasted spreadsheet rows (tab-separated) or CSV text, honouring quotes. */
export function parseDelimited(text: string) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || "";
  const delim = first.includes("\t") ? "\t" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  return out.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

/** Reads Style #, Style name, Color, Quantity, Unit value, Size rows; a header row may reorder the columns. */
export function parseSheet(text: string): { rows: SheetRow[]; errors: string[] } {
  const grid = parseDelimited(text);
  if (!grid.length) return { rows: [], errors: ["Nothing to import yet. Paste rows or choose a file."] };
  let cols = { num: 0, name: 1, color: 2, qty: 3, val: 4, size: 5 };
  const h = grid[0].map((c) => c.toLowerCase());
  const header = h.some((c) => /style|colou?r|qty|quantity|value|cost|price|sku|size/.test(c)) && !h.some((c) => /^\$?[\d,.]+$/.test(c));
  if (header) {
    const find = (re: RegExp, fallback: number) => {
      const i = h.findIndex((c) => re.test(c));
      return i >= 0 ? i : fallback;
    };
    cols = {
      num: find(/style\s*(#|no|num|code)|sku|item\s*#/, 0),
      name: find(/style\s*name|description|^name$|^style$/, 1),
      color: find(/colou?r/, 2),
      qty: find(/qty|quantity|on\s*hand|units|count/, 3),
      val: find(/value|cost|price|unit/, 4),
      size: find(/size/, 5),
    };
    grid.shift();
  }
  const rows: SheetRow[] = [];
  const errors: string[] = [];
  grid.forEach((r, i) => {
    const n = i + 1 + (header ? 1 : 0);
    const qtyText = r[cols.qty] || "0";
    const valText = r[cols.val] || "0";
    const row: SheetRow = {
      styleNumber: r[cols.num] || "",
      styleName: r[cols.name] || "",
      color: r[cols.color] || "",
      size: r[cols.size] || "",
      qty: Number(qtyText.replace(/[,\s]/g, "")),
      unitValue: Number(valText.replace(/[$,\s]/g, "")),
    };
    if (!row.styleNumber || !row.color) return void errors.push(`Row ${n}: needs a style # and a color.`);
    if (!Number.isInteger(row.qty) || row.qty < 0) return void errors.push(`Row ${n}: quantity "${qtyText}" isn't a whole number.`);
    if (!Number.isFinite(row.unitValue) || row.unitValue < 0) return void errors.push(`Row ${n}: unit value "${valText}" isn't a dollar amount.`);
    row.unitValue = Math.round(row.unitValue * 100) / 100;
    rows.push(row);
  });
  return { rows, errors };
}
