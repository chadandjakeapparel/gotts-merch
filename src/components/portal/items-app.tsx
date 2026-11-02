"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "@/lib/portal/types";
import { api } from "./api";
import {
  CATALOG_ITEM_TEMPLATE_EXAMPLE_ROWS,
  CATALOG_ITEM_TEMPLATE_HEADERS,
  parseCatalogItemSheet,
} from "./catalog-items-sheet";

const count = new Intl.NumberFormat("en-US");
const SEARCH_LIMIT = 200;

function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]): string {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

function downloadItemTemplate() {
  downloadFile(
    "items-template.csv",
    toCsv([CATALOG_ITEM_TEMPLATE_HEADERS, ...CATALOG_ITEM_TEMPLATE_EXAMPLE_ROWS]),
    "text/csv;charset=utf-8;",
  );
}

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function useSubmit(onDone: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (run: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}

function ModalFrame({ title, children, footer, close }: { title: string; children: React.ReactNode; footer: React.ReactNode; close: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="portal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div aria-modal="true" className="portal-modal" role="dialog">
        <div className="portal-modal-head"><h2>{title}</h2></div>
        <div className="portal-modal-body">{children}</div>
        <div className="portal-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

type Filters = { itemTypes: string[]; vendors: string[] };

export function ItemsApp({
  initialItems,
  initialFilters,
  initialTotal,
  loadError,
}: {
  initialItems: CatalogItem[];
  initialFilters: Filters;
  initialTotal: number;
  loadError: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [filterOptions, setFilterOptions] = useState<Filters>(initialFilters);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(loadError);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(SEARCH_LIMIT) });
      if (query.trim()) params.set("q", query.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (vendorFilter) params.set("vendor", vendorFilter);
      const res = await api<{ items: CatalogItem[]; itemTypes: string[]; vendors: string[]; total: number }>(
        "GET",
        `/api/portal/catalog-items?${params.toString()}`,
      );
      setItems(res.items);
      setFilterOptions({ itemTypes: res.itemTypes, vendors: res.vendors });
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The item catalog couldn't be searched.");
    } finally {
      setLoading(false);
    }
  };

  // The first render already has the server-fetched results; only search again once the person changes something.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = window.setTimeout(() => void search(), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeFilter, vendorFilter]);

  const selected = selectedId ? items.find((i) => i.id === selectedId) || null : null;
  const filtered = Boolean(query || typeFilter || vendorFilter);

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Items</h1>
        </div>
        <span className="portal-row-actions">
          <button className="portal-btn" onClick={() => setImporting(true)} type="button">Import from spreadsheet</button>
          <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New item</button>
        </span>
      </div>
      <p className="portal-hint">{count.format(total)} {total === 1 ? "item" : "items"} in the catalog.</p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-toolbar">
        <input
          aria-label="Search items"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search item name/number or display name…"
          type="search"
          value={query}
        />
        <select aria-label="Filter by item type" onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
          <option value="">All item types</option>
          {filterOptions.itemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Filter by vendor" onChange={(e) => setVendorFilter(e.target.value)} value={vendorFilter}>
          <option value="">All vendors</option>
          {filterOptions.vendors.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {filtered ? (
          <button
            className="portal-btn small"
            onClick={() => {
              setQuery("");
              setTypeFilter("");
              setVendorFilter("");
            }}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Item name/number</th>
              <th>Display name</th>
              <th>Item type</th>
              <th>Primary vendor</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="portal-col-empty" colSpan={5}>Searching…</td></tr>
            ) : items.length ? (
              items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <button className="portal-link" onClick={() => setSelectedId(i.id)} type="button">
                      {i.itemNumber || "Untitled item"}
                    </button>
                  </td>
                  <td>{i.displayName}</td>
                  <td>{i.itemType}</td>
                  <td>{i.primaryVendor}</td>
                  <td>{fmtDate(i.updatedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="portal-col-empty" colSpan={5}>
                  {filtered ? "No items match those filters." : "No items yet -- add one or import a spreadsheet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {items.length >= SEARCH_LIMIT ? (
        <p className="portal-muted small">Showing the first {count.format(SEARCH_LIMIT)} matches -- narrow your search to see more.</p>
      ) : null}

      {adding ? (
        <ItemModal close={() => setAdding(false)} item={null} itemTypes={filterOptions.itemTypes} onSaved={search} vendors={filterOptions.vendors} />
      ) : null}
      {selected ? (
        <ItemModal
          close={() => setSelectedId(null)}
          item={selected}
          itemTypes={filterOptions.itemTypes}
          key={selected.id}
          onSaved={search}
          vendors={filterOptions.vendors}
        />
      ) : null}
      {importing ? <ImportItemsForm close={() => setImporting(false)} onImported={search} /> : null}
    </div>
  );
}

function ItemModal({
  item,
  close,
  onSaved,
  itemTypes,
  vendors,
}: {
  item: CatalogItem | null;
  close: () => void;
  onSaved: () => Promise<void>;
  itemTypes: string[];
  vendors: string[];
}) {
  const [form, setForm] = useState({
    itemNumber: item?.itemNumber || "",
    displayName: item?.displayName || "",
    itemType: item?.itemType || "",
    primaryVendor: item?.primaryVendor || "",
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemNumber.trim()) return setError("Give the item a name/number.");
    void submit(() =>
      item ? api("PATCH", `/api/portal/catalog-items/${item.id}`, form) : api("POST", "/api/portal/catalog-items", form),
    );
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {item ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this item?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/catalog-items/${item.id}`))}
                  type="button"
                >
                  Delete
                </button>
                <button className="portal-btn small" onClick={() => setConfirmingDelete(false)} type="button">Cancel</button>
              </span>
            ) : (
              <button className="portal-btn danger push-left" onClick={() => setConfirmingDelete(true)} type="button">Delete</button>
            )
          ) : null}
          <button className="portal-btn" onClick={close} type="button">Cancel</button>
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{item ? "Save" : "Add item"}</button>
        </>
      }
      title={item ? item.itemNumber || "Untitled item" : "New item"}
    >
      <label className="portal-field">Item name/number<input autoFocus onChange={set("itemNumber")} value={form.itemNumber} /></label>
      <label className="portal-field">Display name<input onChange={set("displayName")} value={form.displayName} /></label>
      <div className="portal-row">
        <label className="portal-field">
          Item type
          <input list="item-types" onChange={set("itemType")} value={form.itemType} />
          <datalist id="item-types">{itemTypes.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="portal-field">
          Primary vendor
          <input list="item-vendors" onChange={set("primaryVendor")} value={form.primaryVendor} />
          <datalist id="item-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
        </label>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

function ImportItemsForm({ close, onImported }: { close: () => void; onImported: () => Promise<void> }) {
  const [textValue, setTextValue] = useState("");
  const [rows, setRows] = useState<ReturnType<typeof parseCatalogItemSheet>["rows"] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const { busy, error, submit } = useSubmit(async () => {
    await onImported();
  });

  const check = (value: string) => {
    const res = parseCatalogItemSheet(value);
    setProblems(res.errors);
    setRows(res.errors.length ? null : res.rows);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!rows?.length) return;
        void submit(async () => {
          const res = await api<{ imported: number }>("POST", "/api/portal/catalog-items", { rows });
          setResult(res);
        });
      }}
    >
      <ModalFrame
        close={close}
        footer={
          result ? (
            <button className="portal-btn primary" onClick={close} type="button">Done</button>
          ) : (
            <>
              <button className="portal-btn" onClick={close} type="button">Cancel</button>
              <button className="portal-btn" onClick={() => check(textValue)} type="button">Check rows</button>
              <button className="portal-btn primary" disabled={busy || !rows?.length} type="submit">Import</button>
            </>
          )
        }
        title="Import items from a spreadsheet"
      >
        <p className="portal-hint">
          Paste rows copied from Excel or Google Sheets, or choose a CSV file -- built for many thousands of rows at
          once. Columns in this order: <strong>Item name/number, Display name, Item type, Primary vendor</strong>. A
          header row is fine, and columns can be in any order if it has one. A row whose item name/number matches an
          existing item updates it instead of adding a duplicate. Need the format?{" "}
          <button className="portal-link" onClick={downloadItemTemplate} type="button">Download the template</button>.
        </p>
        {result ? (
          <p className="portal-msg ok">Imported {count.format(result.imported)} {result.imported === 1 ? "item" : "items"}.</p>
        ) : (
          <>
            <textarea
              aria-label="Rows to import"
              className="portal-mono"
              onChange={(e) => {
                setTextValue(e.target.value);
                setRows(null);
                setProblems([]);
              }}
              placeholder={CATALOG_ITEM_TEMPLATE_HEADERS.join("\t")}
              rows={8}
              value={textValue}
            />
            <input
              accept=".csv,.tsv,.txt,text/csv"
              aria-label="Choose a CSV file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then((value) => {
                  setTextValue(value);
                  check(value);
                });
              }}
              type="file"
            />
            {problems.length ? (
              <p className="portal-msg err" role="alert">{problems.slice(0, 4).join(" ")}{problems.length > 4 ? ` (${problems.length - 4} more)` : ""}</p>
            ) : null}
            {rows ? <p className="portal-msg ok">{count.format(rows.length)} {rows.length === 1 ? "row" : "rows"} ready to import.</p> : null}
          </>
        )}
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}
