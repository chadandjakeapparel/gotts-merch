"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ClientSummary, Item, Order, OrderStatus, PortalState, StockMove, Viewer } from "@/lib/portal/types";
import { api } from "./api";
import { PortalHeader } from "./portal-header";
import { parseSheet, type SheetRow } from "./sheet";

const LOW_STOCK = 12;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const count = new Intl.NumberFormat("en-US");

type Tab = "inventory" | "orders" | "history";
type Modal =
  | { kind: "item"; item: Item | null }
  | { kind: "deleteItem"; item: Item }
  | { kind: "receive" }
  | { kind: "import" }
  | { kind: "order"; order: Order | null }
  | { kind: "ship"; order: Order }
  | { kind: "cancel"; order: Order }
  | null;

// ---------- helpers ----------

type Api = <T = Record<string, unknown>>(method: string, url: string, body?: unknown) => Promise<T>;
const ApiContext = createContext<Api>(api);
/** The API caller for the client being viewed. */
const useApi = () => useContext(ApiContext);

function fmtDate(value: string | null, withTime = false) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

const itemLabel = (i: Pick<Item, "styleNumber" | "styleName" | "color" | "size">) =>
  [i.styleNumber, i.styleName, i.color, i.size].filter(Boolean).join(" · ");

function stockLevel(i: Item): "in" | "low" | "out" {
  if (i.qty <= 0) return "out";
  if (i.qty <= LOW_STOCK) return "low";
  return "in";
}

const SWATCHES: Record<string, string> = {
  black: "#1b1b1b", white: "#ffffff", navy: "#1f2a4d", red: "#c0392b", maroon: "#6d1f2a", burgundy: "#6b1f33",
  royal: "#2a4fbf", blue: "#2f6bd8", "light blue": "#9cc3ea", "sky blue": "#8ec5f0", "carolina blue": "#7bafd4",
  green: "#2e8b57", forest: "#22492f", "kelly green": "#2a9d4a", olive: "#6b6b2a", sage: "#9caf88", mint: "#a8e6cf",
  grey: "#8a8f98", gray: "#8a8f98", heather: "#b5b8bd", charcoal: "#3f4247", ash: "#d6d6d2",
  brown: "#6b4a2f", tan: "#c8a97e", khaki: "#bfae86", sand: "#d9c7a5", natural: "#efe6d2", cream: "#f2ead8", oatmeal: "#e3d9c6", ivory: "#f3eedf",
  pink: "#f2a7c3", "light pink": "#f6cbdb", "hot pink": "#ff5fa2", purple: "#6b3fa0", lavender: "#b9a7dc", orange: "#e67e22",
  gold: "#d4a017", yellow: "#f2cc2f", teal: "#1f8a8a", turquoise: "#33b5b5", coral: "#f2735a", denim: "#3d5a80", indigo: "#3b3f8f",
};
function swatch(color: string) {
  const n = color.trim().toLowerCase();
  if (SWATCHES[n]) return SWATCHES[n];
  const key = Object.keys(SWATCHES).sort((a, b) => b.length - a.length).find((k) => n.includes(k));
  return key ? SWATCHES[key] : "transparent";
}

const CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "Other"];
function trackingUrl(carrier: string, tracking: string) {
  const t = encodeURIComponent(tracking.trim());
  if (!t) return "";
  switch (carrier) {
    case "UPS": return `https://www.ups.com/track?tracknum=${t}`;
    case "FedEx": return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case "USPS": return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case "DHL": return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`;
    default: return "";
  }
}

const orderUnits = (o: Order) => o.lines.reduce((s, l) => s + l.qty, 0);
const orderValue = (o: Order) => o.lines.reduce((s, l) => s + l.qty * l.unitValue, 0);
const STATUS_LABEL: Record<OrderStatus, string> = { open: "Received", fulfilled: "Fulfilled", shipped: "Shipped", cancelled: "Cancelled" };

// ---------- app ----------

export function PortalApp({
  viewer,
  clients,
  clientId,
  clientName,
  initialState,
  loadError,
}: {
  viewer: Viewer;
  /** Every client, for staff to switch between; null for client logins. */
  clients: ClientSummary[] | null;
  clientId: number;
  clientName: string;
  initialState: PortalState;
  loadError: string;
}) {
  const admin = viewer.role === "staff";
  const router = useRouter();
  const call = useMemo<Api>(
    () => (method, url, body) => api(method, `${url}${url.includes("?") ? "&" : "?"}client=${clientId}`, body),
    [clientId],
  );
  const [data, setData] = useState(initialState);
  const [error, setError] = useState(loadError);
  const [tab, setTab] = useState<Tab>("inventory");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  useEffect(() => setUpdatedAt(new Date()), []);

  const refresh = useCallback(async () => {
    try {
      const res = await call<{ state: PortalState }>("GET", "/api/portal/state");
      setData(res.state);
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The inventory couldn't be refreshed.");
    }
  }, [call]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** Runs a change, refreshes the data and reports the outcome. Throws so forms can show the error inline. */
  const mutate = useCallback(
    async (run: () => Promise<unknown>, done: string) => {
      await run();
      await refresh();
      setModal(null);
      setToast(done);
    },
    [refresh],
  );

  const totals = useMemo(() => {
    const units = data.items.reduce((s, i) => s + i.qty, 0);
    const value = data.items.reduce((s, i) => s + i.qty * i.unitValue, 0);
    const low = data.items.filter((i) => stockLevel(i) !== "in").length;
    const open = data.orders.filter((o) => o.status === "open");
    const review = open.filter((o) => o.needsReview).length;
    return { units, value, low, openOrders: open.length, openUnits: open.reduce((s, o) => s + orderUnits(o), 0), review };
  }, [data]);

  return (
    <ApiContext.Provider value={call}>
    <div className="portal">
      <PortalHeader current="inventory" viewer={viewer}>
        {clients ? (
          <label className="portal-switch">
            <span className="portal-sr">Client</span>
            <select onChange={(e) => router.push(`/portal?client=${e.target.value}`)} value={clientId}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.openOrders ? ` (${c.openOrders} open)` : ""}</option>
              ))}
            </select>
          </label>
        ) : null}
      </PortalHeader>

      <main className="portal-main">
        <div className="portal-title-row">
          <div>
            <span className="portal-eyebrow">{admin ? "Viewing client" : "Inventory held for"}</span>
            <h1>{clientName}</h1>
          </div>
          <div className="portal-updated">
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : null}
            <button className="portal-link" onClick={() => void refresh()} type="button">Refresh</button>
          </div>
        </div>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

        <section aria-label="Totals" className="portal-summary">
          <div><span className="portal-eyebrow">Units on hand</span><strong>{count.format(totals.units)}</strong></div>
          <div><span className="portal-eyebrow">Inventory value</span><strong>{currency.format(totals.value)}</strong></div>
          <div>
            <span className="portal-eyebrow">Open orders</span>
            <strong>{count.format(totals.openOrders)}</strong>
            <span className="portal-muted small">{count.format(totals.openUnits)} units waiting to ship</span>
          </div>
          <div>
            <span className="portal-eyebrow">Low or out of stock</span>
            <strong className={totals.low ? "warn" : ""}>{count.format(totals.low)}</strong>
            <span className="portal-muted small">{LOW_STOCK} units or fewer</span>
          </div>
        </section>

        <nav aria-label="Sections" className="portal-tabs" role="tablist">
          {(
            [
              ["inventory", "Inventory", data.items.length],
              ["orders", "Orders", totals.openOrders],
              ["history", "Stock history", null],
            ] as const
          ).map(([key, text, n]) => (
            <button aria-selected={tab === key} key={key} onClick={() => setTab(key)} role="tab" type="button">
              {text}
              {n ? <span className="portal-count">{count.format(n)}</span> : null}
              {key === "orders" && admin && totals.review ? <span className="portal-count warn">{totals.review} to review</span> : null}
            </button>
          ))}
        </nav>

        {tab === "inventory" ? <InventoryTab admin={admin} items={data.items} setModal={setModal} /> : null}
        {tab === "orders" ? <OrdersTab admin={admin} items={data.items} mutate={mutate} orders={data.orders} setModal={setModal} /> : null}
        {tab === "history" ? <HistoryTab moves={data.moves} /> : null}
      </main>

      {modal ? (
        <ModalHost close={() => setModal(null)} items={data.items} modal={modal} mutate={mutate} setModal={setModal} />
      ) : null}
      {toast ? <div className="portal-toast" role="status">{toast}</div> : null}
    </div>
    </ApiContext.Provider>
  );
}

// ---------- inventory ----------

type SortKey = "styleNumber" | "styleName" | "color" | "size" | "qty" | "committed" | "available" | "unitValue" | "total";

function InventoryTab({ items, admin, setModal }: { items: Item[]; admin: boolean; setModal: (m: Modal) => void }) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "styleNumber", dir: 1 });

  const colors = useMemo(() => [...new Set(items.map((i) => i.color))].sort((a, b) => a.localeCompare(b)), [items]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (i: Item, k: SortKey): string | number =>
      k === "available" ? i.qty - i.committed : k === "total" ? i.qty * i.unitValue : i[k];
    return items
      .filter((i) => !q || `${i.styleNumber} ${i.styleName} ${i.color} ${i.size}`.toLowerCase().includes(q))
      .filter((i) => !color || i.color === color)
      .filter((i) => !level || stockLevel(i) === level)
      .sort((a, b) => {
        const av = value(a, sort.key);
        const bv = value(b, sort.key);
        const c = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        return c * sort.dir || a.color.localeCompare(b.color) || a.size.localeCompare(b.size);
      });
  }, [items, query, color, level, sort]);

  const header = (key: SortKey, text: string, right = false) => (
    <th aria-sort={sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : "none"} className={right ? "r" : ""}>
      <button
        className="portal-sort"
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: right ? -1 : 1 }))}
        type="button"
      >
        {text}
        {sort.key === key ? (sort.dir > 0 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  const shownUnits = rows.reduce((s, i) => s + i.qty, 0);
  const shownValue = rows.reduce((s, i) => s + i.qty * i.unitValue, 0);

  return (
    <section className="portal-panel">
      <div className="portal-toolbar">
        <input aria-label="Search inventory" onChange={(e) => setQuery(e.target.value)} placeholder="Search style, name or color" type="search" value={query} />
        <select aria-label="Filter by color" onChange={(e) => setColor(e.target.value)} value={color}>
          <option value="">All colors</option>
          {colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Filter by stock level" onChange={(e) => setLevel(e.target.value)} value={level}>
          <option value="">All stock levels</option>
          <option value="in">In stock</option>
          <option value="low">Low</option>
          <option value="out">Out of stock</option>
        </select>
        {admin ? (
          <div className="portal-toolbar-end">
            <button className="portal-btn" onClick={() => setModal({ kind: "import" })} type="button">Import</button>
            <button className="portal-btn" onClick={() => setModal({ kind: "item", item: null })} type="button">Add style</button>
            <button className="portal-btn primary" disabled={!items.length} onClick={() => setModal({ kind: "receive" })} type="button">Receive stock</button>
          </div>
        ) : null}
      </div>

      {rows.length ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                {header("styleNumber", "Style #")}
                {header("styleName", "Style name")}
                {header("color", "Color")}
                {header("size", "Size")}
                {header("qty", "On hand", true)}
                {header("committed", "On open orders", true)}
                {header("available", "Available", true)}
                {header("unitValue", "Unit value", true)}
                {header("total", "Total value", true)}
                {admin ? <th className="r"><span className="portal-sr">Actions</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const lvl = stockLevel(i);
                const available = i.qty - i.committed;
                return (
                  <tr key={i.id}>
                    <td><span className="portal-tag">{i.styleNumber}</span></td>
                    <td>{i.styleName}</td>
                    <td><span className="portal-color"><span className="portal-swatch" style={{ background: swatch(i.color) }} />{i.color}</span></td>
                    <td>{i.size}</td>
                    <td className="r num">
                      <strong>{count.format(i.qty)}</strong>
                      {lvl !== "in" ? <span className={`portal-pill ${lvl}`}>{lvl === "out" ? "Out" : "Low"}</span> : null}
                    </td>
                    <td className="r num portal-muted">{i.committed ? count.format(i.committed) : "–"}</td>
                    <td className={`r num ${available < 0 ? "neg" : ""}`}>{count.format(available)}</td>
                    <td className="r num">{currency.format(i.unitValue)}</td>
                    <td className="r num">{currency.format(i.qty * i.unitValue)}</td>
                    {admin ? (
                      <td className="r"><button className="portal-btn small" onClick={() => setModal({ kind: "item", item: i })} type="button">Edit</button></td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>{rows.length === items.length ? `${rows.length} lines` : `Showing ${rows.length} of ${items.length} lines`}</td>
                <td className="r num">{count.format(shownUnits)}</td>
                <td colSpan={3} />
                <td className="r num">{currency.format(shownValue)}</td>
                {admin ? <td /> : null}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="portal-empty">
          <h3>{items.length ? "No styles match" : "No inventory loaded yet"}</h3>
          <p className="portal-muted">
            {items.length
              ? "Clear the search or filters to see every style."
              : admin
                ? "Use Import to paste your current stock sheet (style #, style name, color, quantity, unit value), or add styles one at a time."
                : "Styles will appear here with their color, quantity on hand and value once they're added."}
          </p>
        </div>
      )}
    </section>
  );
}

// ---------- orders ----------

type OrderFilter = "all" | "review" | OrderStatus;

function OrdersTab({
  orders,
  items,
  admin,
  setModal,
  mutate,
}: {
  orders: Order[];
  items: Item[];
  admin: boolean;
  setModal: (m: Modal) => void;
  mutate: (run: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  const call = useApi();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, review: 0, open: 0, fulfilled: 0, shipped: 0, cancelled: 0 };
    for (const o of orders) {
      c[o.status]++;
      if (o.status === "open" && o.needsReview) c.review++;
    }
    return c;
  }, [orders]);

  const shown = orders.filter((o) => {
    if (filter === "review" ? !(o.status === "open" && o.needsReview) : filter !== "all" && o.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [o.ref, o.customerName, o.shipTo, o.tracking, ...o.lines.map((l) => `${l.styleNumber} ${l.color} ${l.rawText}`)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  async function act(order: Order, action: "fulfill", done: string) {
    setBusyId(order.id);
    setRowError(null);
    try {
      await mutate(() => call("PATCH", `/api/portal/orders/${order.id}`, { action }), done);
    } catch (err) {
      setRowError({ id: order.id, text: err instanceof Error ? err.message : "That didn't work. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  const filters: [OrderFilter, string][] = [
    ["all", "All"],
    ...(admin ? ([["review", "Needs review"]] as [OrderFilter, string][]) : []),
    ["open", "Received"],
    ["fulfilled", "Fulfilled"],
    ["shipped", "Shipped"],
    ["cancelled", "Cancelled"],
  ];

  return (
    <section className="portal-panel">
      <div className="portal-toolbar">
        <div className="portal-filters" role="group" aria-label="Filter orders by status">
          {filters.map(([key, text]) => (
            <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)} type="button">
              {text} <span className="num">{counts[key]}</span>
            </button>
          ))}
        </div>
        <input aria-label="Search orders" onChange={(e) => setQuery(e.target.value)} placeholder="Search PO, style, tracking" type="search" value={query} />
        {admin ? (
          <div className="portal-toolbar-end">
            <button className="portal-btn primary" disabled={!items.length} onClick={() => setModal({ kind: "order", order: null })} type="button">New order</button>
          </div>
        ) : null}
      </div>

      {shown.length ? (
        <ul className="portal-orders">
          {shown.map((o) => (
            <li className={`portal-order ${o.status}`} key={o.id}>
              <div className="portal-order-head">
                <div className="portal-order-id">
                  <h3>{o.ref || `Order ${o.id}`}</h3>
                  <span className="portal-muted small">
                    {o.source === "jotform" ? "Submitted through JotForm" : "Entered by Chad & Jake"} · {fmtDate(o.createdAt, true)}
                  </span>
                </div>
                <Steps order={o} />
              </div>

              {o.customerName || o.shipTo || o.notes ? (
                <dl className="portal-order-meta">
                  {o.customerName ? <div><dt>Customer</dt><dd>{o.customerName}</dd></div> : null}
                  {o.shipTo ? <div><dt>Ship to</dt><dd>{o.shipTo}</dd></div> : null}
                  {o.notes ? <div><dt>Notes</dt><dd>{o.notes}</dd></div> : null}
                </dl>
              ) : null}

              <div className="portal-table-wrap">
                <table className="portal-table compact">
                  <thead>
                    <tr><th>Style #</th><th>Style name</th><th>Color</th><th>Size</th><th className="r">Qty</th><th className="r">Value</th></tr>
                  </thead>
                  <tbody>
                    {o.lines.map((l) =>
                      l.itemId == null ? (
                        <tr className="unmatched" key={l.id}>
                          <td colSpan={4}>
                            <span className="portal-pill low">Not matched</span> {l.rawText || [l.styleNumber, l.color, l.size].filter(Boolean).join(" ")}
                          </td>
                          <td className="r num">{l.qty ? count.format(l.qty) : "?"}</td>
                          <td className="r">–</td>
                        </tr>
                      ) : (
                        <tr key={l.id}>
                          <td><span className="portal-tag">{l.styleNumber}</span></td>
                          <td>{l.styleName}</td>
                          <td><span className="portal-color"><span className="portal-swatch" style={{ background: swatch(l.color) }} />{l.color}</span></td>
                          <td>{l.size}</td>
                          <td className="r num">{count.format(l.qty)}</td>
                          <td className="r num">{currency.format(l.qty * l.unitValue)}</td>
                        </tr>
                      ),
                    )}
                    {!o.lines.length ? <tr><td className="portal-muted" colSpan={6}>No items were read from this order.</td></tr> : null}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={4}>Total</td><td className="r num">{count.format(orderUnits(o))}</td><td className="r num">{currency.format(orderValue(o))}</td></tr>
                  </tfoot>
                </table>
              </div>

              {o.status === "shipped" && o.tracking ? (
                <p className="portal-tracking">
                  {o.carrier ? `${o.carrier} tracking ` : "Tracking "}
                  {trackingUrl(o.carrier, o.tracking) ? (
                    <a href={trackingUrl(o.carrier, o.tracking)} rel="noreferrer" target="_blank">{o.tracking}</a>
                  ) : (
                    <span className="mono">{o.tracking}</span>
                  )}
                </p>
              ) : null}

              {admin && o.status === "open" && o.needsReview ? (
                <p className="portal-msg warn">Some lines need a style matched or a quantity before this order can be fulfilled. Use Edit to fix them.</p>
              ) : null}
              {rowError?.id === o.id ? <p className="portal-msg err" role="alert">{rowError.text}</p> : null}

              {admin && o.status !== "cancelled" ? (
                <div className="portal-order-actions">
                  {o.status === "open" ? (
                    <>
                      <button className="portal-btn primary" disabled={busyId === o.id || o.needsReview} onClick={() => act(o, "fulfill", "Order fulfilled. Stock updated.")} type="button">
                        Fulfill
                      </button>
                      <button className="portal-btn" disabled={o.needsReview} onClick={() => setModal({ kind: "ship", order: o })} type="button">Mark shipped</button>
                      <button className="portal-btn" onClick={() => setModal({ kind: "order", order: o })} type="button">Edit</button>
                    </>
                  ) : null}
                  {o.status === "fulfilled" ? (
                    <button className="portal-btn primary" onClick={() => setModal({ kind: "ship", order: o })} type="button">Mark shipped</button>
                  ) : null}
                  {o.status === "shipped" ? (
                    <button className="portal-btn" onClick={() => setModal({ kind: "ship", order: o })} type="button">Edit tracking</button>
                  ) : null}
                  {o.status !== "shipped" ? (
                    <button className="portal-btn danger" onClick={() => setModal({ kind: "cancel", order: o })} type="button">Cancel order</button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="portal-empty">
          <h3>{orders.length ? "No orders match" : "No orders yet"}</h3>
          <p className="portal-muted">
            {orders.length
              ? "Try another status or clear the search."
              : "Orders submitted through the order form show up here, with their status as they're fulfilled and shipped."}
          </p>
        </div>
      )}
    </section>
  );
}

function Steps({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return <span className="portal-status cancelled">Cancelled {fmtDate(order.cancelledAt)}</span>;
  }
  const steps: [string, string | null][] = [
    ["Received", order.createdAt],
    ["Fulfilled", order.fulfilledAt],
    ["Shipped", order.shippedAt],
  ];
  return (
    <ol aria-label={`Status: ${STATUS_LABEL[order.status]}`} className="portal-steps">
      {steps.map(([name, at]) => (
        <li className={at ? "done" : ""} key={name}>
          <span className="dot" aria-hidden="true" />
          <span className="name">{name}</span>
          <span className="when">{at ? fmtDate(at) : "Pending"}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------- history ----------

const MOVE_LABEL: Record<StockMove["kind"], string> = {
  received: "Received",
  fulfilled: "Order fulfilled",
  restored: "Order cancelled",
  adjusted: "Count adjusted",
  imported: "Spreadsheet import",
  added: "Style added",
  deleted: "Style removed",
};

function HistoryTab({ moves }: { moves: StockMove[] }) {
  if (!moves.length) {
    return (
      <section className="portal-panel">
        <div className="portal-empty">
          <h3>No stock changes yet</h3>
          <p className="portal-muted">Every receipt, fulfilled order and count change is listed here, newest first.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="portal-panel">
      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr><th>Date</th><th>What happened</th><th>Style</th><th className="r">Units</th><th>Reference</th><th>Note</th></tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{fmtDate(m.createdAt, true)}</td>
                <td><span className={`portal-kind ${m.kind}`}>{MOVE_LABEL[m.kind] || m.kind}</span></td>
                <td>{m.label}</td>
                <td className={`r num ${m.qtyDelta < 0 ? "neg" : m.qtyDelta > 0 ? "pos" : ""}`}>
                  {m.kind === "imported" ? "" : `${m.qtyDelta > 0 ? "+" : ""}${count.format(m.qtyDelta)}`}
                </td>
                <td>{m.ref}</td>
                <td className="portal-muted">{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- modals ----------

type ModalProps = {
  modal: NonNullable<Modal>;
  items: Item[];
  close: () => void;
  setModal: (m: Modal) => void;
  mutate: (run: () => Promise<unknown>, done: string) => Promise<void>;
};

function ModalHost(props: ModalProps) {
  const { modal, close } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  let body: React.ReactNode = null;
  switch (modal.kind) {
    case "item": body = <ItemForm {...props} item={modal.item} />; break;
    case "deleteItem": body = <DeleteItem {...props} item={modal.item} />; break;
    case "receive": body = <ReceiveForm {...props} />; break;
    case "import": body = <ImportForm {...props} />; break;
    case "order": body = <OrderForm {...props} order={modal.order} />; break;
    case "ship": body = <ShipForm {...props} order={modal.order} />; break;
    case "cancel": body = <CancelOrder {...props} order={modal.order} />; break;
  }
  return (
    <div className="portal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div aria-modal="true" className="portal-modal" role="dialog">{body}</div>
    </div>
  );
}

/** Shared submit state for modal forms. */
function useSubmit(mutate: ModalProps["mutate"]) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (run: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await mutate(run, done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}

function ModalFrame({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <>
      <div className="portal-modal-head"><h2>{title}</h2></div>
      <div className="portal-modal-body">{children}</div>
      <div className="portal-modal-foot">{footer}</div>
    </>
  );
}

function ItemForm({ item, close, setModal, mutate }: ModalProps & { item: Item | null }) {
  const call = useApi();
  const [form, setForm] = useState({
    styleNumber: item?.styleNumber || "",
    styleName: item?.styleName || "",
    color: item?.color || "",
    size: item?.size || "",
    qty: String(item?.qty ?? 0),
    unitValue: String(item?.unitValue ?? 0),
  });
  const { busy, error, setError, submit } = useSubmit(mutate);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.styleNumber.trim() || !form.color.trim()) return setError("Style # and color are required.");
    void submit(
      () => (item ? call("PATCH", `/api/portal/items/${item.id}`, form) : call("POST", "/api/portal/items", form)),
      item ? "Saved." : `Added ${[form.styleNumber, form.color, form.size].filter(Boolean).join(" ")}.`,
    );
  }

  return (
    <form onSubmit={save}>
      <ModalFrame
        footer={
          <>
            {item ? <button className="portal-btn danger push-left" onClick={() => setModal({ kind: "deleteItem", item })} type="button">Delete</button> : null}
            <button className="portal-btn" onClick={close} type="button">Cancel</button>
            <button className="portal-btn primary" disabled={busy} type="submit">{item ? "Save" : "Add style"}</button>
          </>
        }
        title={item ? `Edit ${[item.styleNumber, item.color, item.size].filter(Boolean).join(" · ")}` : "Add a style / color"}
      >
        <div className="portal-row">
          <label className="portal-field">Style #<input autoFocus onChange={set("styleNumber")} required value={form.styleNumber} /></label>
          <label className="portal-field">Color<input onChange={set("color")} required value={form.color} /></label>
          <label className="portal-field">Size<input onChange={set("size")} value={form.size} /></label>
        </div>
        <label className="portal-field">Style name<input onChange={set("styleName")} value={form.styleName} /></label>
        <div className="portal-row">
          <label className="portal-field">Quantity on hand<input min={0} onChange={set("qty")} required step={1} type="number" value={form.qty} /></label>
          <label className="portal-field">Unit value ($)<input min={0} onChange={set("unitValue")} required step={0.01} type="number" value={form.unitValue} /></label>
        </div>
        <p className="portal-hint">
          {item
            ? "Changing the quantity here is logged as a count adjustment. To ship goods, fulfill an order instead."
            : "Each color and size of a style is its own line, so stock is counted separately. Leave size blank if it doesn't apply."}
        </p>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}

function DeleteItem({ item, setModal, mutate }: ModalProps & { item: Item }) {
  const call = useApi();
  const { busy, error, submit } = useSubmit(mutate);
  return (
    <ModalFrame
      footer={
        <>
          <button className="portal-btn" onClick={() => setModal({ kind: "item", item })} type="button">Keep it</button>
          <button className="portal-btn primary" disabled={busy} onClick={() => submit(() => call("DELETE", `/api/portal/items/${item.id}`), "Line deleted.")} type="button">
            Delete line
          </button>
        </>
      }
      title="Delete this line?"
    >
      <p>{itemLabel(item)}, with {count.format(item.qty)} units on hand, will be removed from inventory. Past orders and stock history stay as they are.</p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

type DraftLine = { key: number; itemId: string; qty: string; rawText?: string };
let lineKey = 0;
const blankLine = (): DraftLine => ({ key: ++lineKey, itemId: "", qty: "" });

/** Rows of style + quantity, used by orders and receipts. */
function LineEditor({ items, lines, setLines, mode }: { items: Item[]; lines: DraftLine[]; setLines: (l: DraftLine[]) => void; mode: "order" | "receive" }) {
  const sorted = useMemo(() => [...items].sort((a, b) => itemLabel(a).localeCompare(itemLabel(b), undefined, { numeric: true })), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [String(i.id), i])), [items]);
  const used = new Map<string, number>();
  for (const l of lines) {
    const q = parseInt(l.qty, 10);
    if (l.itemId && q > 0) used.set(l.itemId, (used.get(l.itemId) || 0) + q);
  }
  const update = (key: number, patch: Partial<DraftLine>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <div className="portal-lines">
      {lines.map((l, index) => {
        const item = byId.get(l.itemId);
        const q = parseInt(l.qty, 10);
        let after = "";
        let short = false;
        if (item && q > 0) {
          const total = used.get(l.itemId) || 0;
          const left = mode === "order" ? item.qty - total : item.qty + total;
          short = left < 0;
          after = `${currency.format(q * item.unitValue)} · ${count.format(item.qty)} on hand → ${count.format(left)} after`;
        }
        return (
          <div className="portal-line" key={l.key}>
            {l.rawText ? <p className="portal-line-raw">From the form: “{l.rawText}”</p> : null}
            <select aria-label={`Style for line ${index + 1}`} onChange={(e) => update(l.key, { itemId: e.target.value })} value={l.itemId}>
              <option value="">Choose style / color…</option>
              {sorted.map((i) => (
                <option key={i.id} value={i.id}>{itemLabel(i)} ({count.format(i.qty)} on hand)</option>
              ))}
            </select>
            <input aria-label={`Quantity for line ${index + 1}`} min={1} onChange={(e) => update(l.key, { qty: e.target.value })} placeholder="Qty" step={1} type="number" value={l.qty} />
            <button aria-label={`Remove line ${index + 1}`} className="portal-x" disabled={lines.length === 1} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} type="button">×</button>
            {after ? <span className={`portal-line-after ${short ? "neg" : ""}`}>{after}</span> : null}
          </div>
        );
      })}
      <button className="portal-link" onClick={() => setLines([...lines, blankLine()])} type="button">+ Add another line</button>
    </div>
  );
}

function lineTotals(items: Item[], lines: DraftLine[]) {
  const byId = new Map(items.map((i) => [String(i.id), i]));
  let units = 0;
  let value = 0;
  for (const l of lines) {
    const q = parseInt(l.qty, 10);
    const item = byId.get(l.itemId);
    if (item && q > 0) {
      units += q;
      value += q * item.unitValue;
    }
  }
  return { units, value };
}

function ReceiveForm({ items, close, mutate }: ModalProps) {
  const call = useApi();
  const [lines, setLines] = useState<DraftLine[]>(() => [blankLine()]);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const { busy, error, setError, submit } = useSubmit(mutate);
  const t = lineTotals(items, lines);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = lines.filter((l) => l.itemId || l.qty);
    if (!clean.length) return setError("Add at least one style and quantity.");
    if (clean.some((l) => !l.itemId || !(parseInt(l.qty, 10) > 0))) return setError("Every line needs a style and a quantity of 1 or more.");
    void submit(
      () => call("POST", "/api/portal/receive", { ref, note, lines: clean.map((l) => ({ itemId: Number(l.itemId), qty: parseInt(l.qty, 10) })) }),
      `Received ${count.format(t.units)} units.`,
    );
  }

  return (
    <form onSubmit={save}>
      <ModalFrame
        footer={<><button className="portal-btn" onClick={close} type="button">Cancel</button><button className="portal-btn primary" disabled={busy} type="submit">Add to stock</button></>}
        title="Receive stock"
      >
        <p className="portal-hint">Each line is added to stock. For a style that isn&apos;t listed yet, add the style first.</p>
        <div className="portal-row">
          <label className="portal-field">Shipment / PO reference<input onChange={(e) => setRef(e.target.value)} value={ref} /></label>
          <label className="portal-field">Note<input onChange={(e) => setNote(e.target.value)} value={note} /></label>
        </div>
        <LineEditor items={items} lines={lines} mode="receive" setLines={setLines} />
        <div className="portal-totals"><span>{count.format(t.units)} units</span><span>{currency.format(t.value)}</span></div>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}

function OrderForm({ items, order, close, mutate }: ModalProps & { order: Order | null }) {
  const call = useApi();
  const [form, setForm] = useState({
    ref: order?.ref || "",
    customerName: order?.customerName || "",
    shipTo: order?.shipTo || "",
    email: order?.email || "",
    notes: order?.notes || "",
  });
  const [lines, setLines] = useState<DraftLine[]>(() =>
    order?.lines.length
      ? order.lines.map((l) => ({
          key: ++lineKey,
          itemId: l.itemId == null ? "" : String(l.itemId),
          qty: l.qty ? String(l.qty) : "",
          rawText: l.itemId == null ? l.rawText || [l.styleNumber, l.color].filter(Boolean).join(" ") : undefined,
        }))
      : [blankLine()],
  );
  const [fulfillNow, setFulfillNow] = useState(false);
  const { busy, error, setError, submit } = useSubmit(mutate);
  const t = lineTotals(items, lines);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = lines.filter((l) => l.itemId || l.qty || l.rawText);
    if (!clean.length) return setError("Add at least one style and quantity.");
    if (clean.some((l) => !l.itemId || !(parseInt(l.qty, 10) > 0))) {
      return setError("Pick a style and enter a quantity on every line, or remove lines you don't need.");
    }
    const payload = { ...form, lines: clean.map((l) => ({ itemId: Number(l.itemId), qty: parseInt(l.qty, 10) })) };
    void submit(
      () => (order
        ? call("PATCH", `/api/portal/orders/${order.id}`, { action: "edit", ...payload })
        : call("POST", "/api/portal/orders", { ...payload, fulfillNow })),
      order ? "Order updated." : fulfillNow ? "Order recorded and fulfilled." : "Order recorded.",
    );
  }

  return (
    <form onSubmit={save}>
      <ModalFrame
        footer={
          <>
            <button className="portal-btn" onClick={close} type="button">Cancel</button>
            <button className="portal-btn primary" disabled={busy} type="submit">{order ? "Save order" : "Record order"}</button>
          </>
        }
        title={order ? `Edit ${order.ref || `order ${order.id}`}` : "New order"}
      >
        <div className="portal-row">
          <label className="portal-field">PO / order number<input onChange={set("ref")} value={form.ref} /></label>
          <label className="portal-field">Customer<input onChange={set("customerName")} value={form.customerName} /></label>
        </div>
        <label className="portal-field">Ship to<input onChange={set("shipTo")} value={form.shipTo} /></label>
        <LineEditor items={items} lines={lines} mode="order" setLines={setLines} />
        <label className="portal-field">Notes<textarea onChange={set("notes")} rows={2} value={form.notes} /></label>
        <div className="portal-totals"><span>{count.format(t.units)} units</span><span>{currency.format(t.value)}</span></div>
        {!order ? (
          <label className="portal-check">
            <input checked={fulfillNow} onChange={(e) => setFulfillNow(e.target.checked)} type="checkbox" />
            Already picked and packed: fulfill now and take the units out of stock
          </label>
        ) : null}
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}

function ShipForm({ order, close, mutate }: ModalProps & { order: Order }) {
  const call = useApi();
  const [carrier, setCarrier] = useState(order.carrier || "UPS");
  const [tracking, setTracking] = useState(order.tracking);
  const { busy, error, submit } = useSubmit(mutate);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(() => call("PATCH", `/api/portal/orders/${order.id}`, { action: "ship", carrier, tracking }), order.status === "shipped" ? "Tracking updated." : "Marked shipped.");
      }}
    >
      <ModalFrame
        footer={<><button className="portal-btn" onClick={close} type="button">Cancel</button><button className="portal-btn primary" disabled={busy} type="submit">{order.status === "shipped" ? "Save tracking" : "Mark shipped"}</button></>}
        title={`${order.status === "shipped" ? "Tracking for" : "Ship"} ${order.ref || `order ${order.id}`}`}
      >
        {order.status === "open" ? <p className="portal-hint">This order hasn&apos;t been fulfilled yet. Marking it shipped also takes its {count.format(orderUnits(order))} units out of stock.</p> : null}
        <div className="portal-row">
          <label className="portal-field">Carrier
            <select onChange={(e) => setCarrier(e.target.value)} value={carrier}>
              {CARRIERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="portal-field">Tracking number<input autoFocus onChange={(e) => setTracking(e.target.value)} value={tracking} /></label>
        </div>
        <p className="portal-hint">Your customer sees the tracking number, linked to the carrier&apos;s tracking page.</p>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}

function CancelOrder({ order, close, mutate }: ModalProps & { order: Order }) {
  const call = useApi();
  const { busy, error, submit } = useSubmit(mutate);
  return (
    <ModalFrame
      footer={
        <>
          <button className="portal-btn" onClick={close} type="button">Keep order</button>
          <button className="portal-btn primary" disabled={busy} onClick={() => submit(() => call("PATCH", `/api/portal/orders/${order.id}`, { action: "cancel" }), "Order cancelled.")} type="button">
            Cancel order
          </button>
        </>
      }
      title={`Cancel ${order.ref || `order ${order.id}`}?`}
    >
      <p>
        {order.status === "fulfilled"
          ? `Its ${count.format(orderUnits(order))} units go back into stock. The order stays in the list, marked cancelled.`
          : "No stock has been taken for it yet. The order stays in the list, marked cancelled."}
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

function ImportForm({ items, close, mutate }: ModalProps) {
  const call = useApi();
  const [textValue, setTextValue] = useState("");
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const { busy, error, submit } = useSubmit(mutate);

  const check = (value: string) => {
    const result = parseSheet(value);
    setProblems(result.errors);
    setRows(result.errors.length ? null : result.rows);
  };
  const existing = useMemo(() => new Set(items.map((i) => `${i.styleNumber.toLowerCase()}|${i.color.toLowerCase()}|${i.size.toLowerCase()}`)), [items]);
  const updates = rows ? rows.filter((r) => existing.has(`${r.styleNumber.toLowerCase()}|${r.color.toLowerCase()}|${r.size.toLowerCase()}`)).length : 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rows?.length) void submit(() => call("POST", "/api/portal/items", { rows }), `Imported ${rows.length} rows.`);
      }}
    >
      <ModalFrame
        footer={
          <>
            <button className="portal-btn" onClick={close} type="button">Cancel</button>
            <button className="portal-btn" onClick={() => check(textValue)} type="button">Check rows</button>
            <button className="portal-btn primary" disabled={busy || !rows?.length} type="submit">Import</button>
          </>
        }
        title="Import from a spreadsheet"
      >
        <p className="portal-hint">
          Paste rows copied from Excel or Google Sheets, or choose a CSV file. Columns in this order: <strong>Style #, Style name, Color, Quantity, Unit value</strong>, with an optional <strong>Size</strong> column after that.
          A header row is fine. A style #, color, and size that already exist get their quantity and value replaced.
        </p>
        <textarea
          aria-label="Rows to import"
          className="portal-mono"
          onChange={(e) => { setTextValue(e.target.value); setRows(null); setProblems([]); }}
          placeholder={"Style #\tStyle name\tColor\tQuantity\tUnit value\tSize"}
          rows={8}
          value={textValue}
        />
        <input
          accept=".csv,.tsv,.txt,text/csv"
          aria-label="Choose a CSV file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void file.text().then((value) => { setTextValue(value); check(value); });
          }}
          type="file"
        />
        {problems.length ? (
          <p className="portal-msg err" role="alert">{problems.slice(0, 4).join(" ")}{problems.length > 4 ? ` (${problems.length - 4} more)` : ""}</p>
        ) : null}
        {rows ? (
          <p className="portal-msg ok">
            {rows.length} rows ready: {rows.length - updates} new, {updates} updated. {count.format(rows.reduce((s, r) => s + r.qty, 0))} units worth {currency.format(rows.reduce((s, r) => s + r.qty * r.unitValue, 0))}.
          </p>
        ) : null}
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}
