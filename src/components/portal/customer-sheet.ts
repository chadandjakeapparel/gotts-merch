export type CustomerRow = { name: string; company: string; email: string; phone: string; notes: string };

/** Splits pasted spreadsheet rows (tab-separated) or CSV text, honouring quotes. */
function parseDelimited(text: string) {
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

/** Reads Name, Company, Email, Phone, Notes rows; a header row may reorder the columns. */
export function parseCustomerSheet(text: string): { rows: CustomerRow[]; errors: string[] } {
  const grid = parseDelimited(text);
  if (!grid.length) return { rows: [], errors: ["Nothing to import yet. Paste rows or choose a file."] };
  let cols = { name: 0, company: 1, email: 2, phone: 3, notes: 4 };
  const h = grid[0].map((c) => c.toLowerCase());
  const header = h.some((c) => /name|company|e[-\s]?mail|phone|notes/.test(c)) && !h.some((c) => /^\+?[\d().\s-]{7,}$/.test(c));
  if (header) {
    const find = (re: RegExp, fallback: number) => {
      const i = h.findIndex((c) => re.test(c));
      return i >= 0 ? i : fallback;
    };
    cols = {
      name: find(/^name$|contact|full\s*name/, 0),
      company: find(/compan|business|organi[sz]ation/, 1),
      email: find(/e[-\s]?mail/, 2),
      phone: find(/phone|mobile|tel/, 3),
      notes: find(/notes?|comment/, 4),
    };
    grid.shift();
  }
  const rows: CustomerRow[] = [];
  const errors: string[] = [];
  grid.forEach((r, i) => {
    const n = i + 1 + (header ? 1 : 0);
    const row: CustomerRow = {
      name: r[cols.name] || "",
      company: r[cols.company] || "",
      email: r[cols.email] || "",
      phone: r[cols.phone] || "",
      notes: r[cols.notes] || "",
    };
    if (!row.name && !row.company) return void errors.push(`Row ${n}: needs a name or a company.`);
    rows.push(row);
  });
  return { rows, errors };
}
