"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Address, Customer, CustomerKind, SalesRep, ShippingAddress } from "@/lib/portal/types";
import { api } from "./api";
import { CUSTOMER_TEMPLATE_EXAMPLE_ROWS, CUSTOMER_TEMPLATE_HEADERS, parseCustomerSheet } from "./customers-sheet";

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

function downloadCustomerTemplate() {
  downloadFile(
    "customers-template.csv",
    toCsv([CUSTOMER_TEMPLATE_HEADERS, ...CUSTOMER_TEMPLATE_EXAMPLE_ROWS]),
    "text/csv;charset=utf-8;",
  );
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

function ModalFrame({
  title,
  children,
  footer,
  close,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  close: () => void;
}) {
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

const customerTitle = (c: Pick<Customer, "kind" | "companyName" | "firstName" | "lastName">) =>
  c.kind === "company"
    ? c.companyName || "Unnamed company"
    : [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed customer";

const emptyAddress = (): Address => ({ name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US" });

/** An address block whose ZIP, once it looks complete, fills in the city and state for you. */
function AddressFields({ legend, value, onChange }: { legend: string; value: Address; onChange: (next: Address) => void }) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const lastLookup = useRef("");
  const [zipStatus, setZipStatus] = useState<"idle" | "looking" | "miss">("idle");

  async function lookupZip() {
    const zip = value.zip.trim();
    if (!/^\d{5}$/.test(zip) || zip === lastLookup.current) return;
    lastLookup.current = zip;
    setZipStatus("looking");
    try {
      const res = await api<{ city: string; state: string }>("GET", `/api/portal/zip-lookup?zip=${zip}`);
      onChange({ ...value, zip, city: res.city || value.city, state: res.state || value.state });
      setZipStatus("idle");
    } catch {
      setZipStatus("miss");
    }
  }

  return (
    <fieldset className="portal-address">
      <legend>{legend}</legend>
      <label className="portal-field">Name<input onChange={set("name")} value={value.name} /></label>
      <label className="portal-field">Address line 1<input onChange={set("line1")} value={value.line1} /></label>
      <label className="portal-field">Address line 2<input onChange={set("line2")} value={value.line2} /></label>
      <div className="portal-row">
        <label className="portal-field">
          Zip code
          <input inputMode="numeric" onBlur={lookupZip} onChange={set("zip")} value={value.zip} />
        </label>
        <label className="portal-field">City<input onChange={set("city")} value={value.city} /></label>
        <label className="portal-field">State<input onChange={set("state")} value={value.state} /></label>
      </div>
      {zipStatus === "miss" ? <p className="portal-hint">Couldn&apos;t look up that ZIP code -- enter the city and state yourself.</p> : null}
      <label className="portal-field">Country<input onChange={set("country")} value={value.country} /></label>
    </fieldset>
  );
}

const addressSummary = (a: Address) =>
  [a.name, a.line1, a.line2, [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ") || "Blank address";

/**
 * The "other" shipping addresses for an existing customer: a saved list
 * plus add/edit/remove and "Make primary", which swaps it with whichever
 * address the top Primary shipping address fields currently hold.
 */
function OtherShippingAddresses({ customerId, onPrimaryChange }: { customerId: number; onPrimaryChange: (next: Address) => void }) {
  const [others, setOthers] = useState<ShippingAddress[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>(emptyAddress());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<Address>(emptyAddress());
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const { busy, error, submit } = useSubmit(async () => {});

  async function refresh() {
    const res = await api<{ addresses: ShippingAddress[] }>("GET", `/api/portal/customers/${customerId}/shipping-addresses`);
    const primary = res.addresses.find((a) => a.isPrimary);
    if (primary) onPrimaryChange({ ...primary });
    setOthers(res.addresses.filter((a) => !a.isPrimary));
  }

  useEffect(() => {
    void refresh();
    // Only on mount: later refreshes are triggered by this component's own actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="portal-field">
      <span>Other shipping addresses</span>
      {others === null ? (
        <p className="portal-muted small">Loading…</p>
      ) : (
        <>
          {others.length ? (
            <ul className="portal-address-list">
              {others.map((a) =>
                editingId === a.id ? (
                  <li key={a.id}>
                    <AddressFields legend="Edit shipping address" onChange={setEditValue} value={editValue} />
                    <span className="portal-row-actions">
                      <button
                        className="portal-btn small primary"
                        disabled={busy}
                        onClick={() =>
                          void submit(async () => {
                            await api("PATCH", `/api/portal/customers/${customerId}/shipping-addresses/${a.id}`, editValue);
                            setEditingId(null);
                            await refresh();
                          })
                        }
                        type="button"
                      >
                        Save
                      </button>
                      <button className="portal-btn small" onClick={() => setEditingId(null)} type="button">Cancel</button>
                    </span>
                  </li>
                ) : (
                  <li key={a.id}>
                    <span className="portal-address-summary">{addressSummary(a)}</span>
                    {confirmingId === a.id ? (
                      <span className="portal-row-actions">
                        <span className="portal-muted small">Remove?</span>
                        <button
                          className="portal-btn small danger"
                          disabled={busy}
                          onClick={() =>
                            void submit(async () => {
                              await api("DELETE", `/api/portal/customers/${customerId}/shipping-addresses/${a.id}`);
                              setConfirmingId(null);
                              await refresh();
                            })
                          }
                          type="button"
                        >
                          Remove
                        </button>
                        <button className="portal-btn small" onClick={() => setConfirmingId(null)} type="button">Cancel</button>
                      </span>
                    ) : (
                      <span className="portal-row-actions">
                        <button
                          className="portal-btn small"
                          disabled={busy}
                          onClick={() =>
                            void submit(async () => {
                              await api("POST", `/api/portal/customers/${customerId}/shipping-addresses/${a.id}/primary`);
                              await refresh();
                            })
                          }
                          type="button"
                        >
                          Make primary
                        </button>
                        <button className="portal-btn small" onClick={() => { setEditingId(a.id); setEditValue(a); }} type="button">Edit</button>
                        <button className="portal-btn small danger" onClick={() => setConfirmingId(a.id)} type="button">Remove</button>
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="portal-muted small">No other shipping addresses yet.</p>
          )}
          {adding ? (
            <>
              <AddressFields legend="New shipping address" onChange={setNewAddress} value={newAddress} />
              <span className="portal-row-actions">
                <button
                  className="portal-btn small primary"
                  disabled={busy}
                  onClick={() =>
                    void submit(async () => {
                      await api("POST", `/api/portal/customers/${customerId}/shipping-addresses`, newAddress);
                      setAdding(false);
                      setNewAddress(emptyAddress());
                      await refresh();
                    })
                  }
                  type="button"
                >
                  Add address
                </button>
                <button className="portal-btn small" onClick={() => setAdding(false)} type="button">Cancel</button>
              </span>
            </>
          ) : (
            <button className="portal-btn small" onClick={() => setAdding(true)} type="button">Add another shipping address</button>
          )}
        </>
      )}
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </div>
  );
}

export function CustomersApp({
  initialCustomers,
  initialSalesReps,
  loadError,
}: {
  initialCustomers: Customer[];
  initialSalesReps: SalesRep[];
  loadError: string;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [salesReps, setSalesReps] = useState(initialSalesReps);
  const [error, setError] = useState(loadError);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [managingReps, setManagingReps] = useState(false);

  const repName = useMemo(() => {
    const m = new Map(salesReps.map((r) => [r.id, r.name]));
    return (id: number | null) => (id == null ? "" : m.get(id) || "Unknown");
  }, [salesReps]);

  const reload = async () => {
    try {
      const res = await api<{ customers: Customer[] }>("GET", "/api/portal/customers");
      setCustomers(res.customers);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The customer list couldn't be refreshed.");
    }
  };

  const reloadReps = async () => {
    const res = await api<{ salesReps: SalesRep[] }>("GET", "/api/portal/sales-reps");
    setSalesReps(res.salesReps);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const haystack = [
        customerTitle(c),
        c.pointOfContact,
        c.phone,
        repName(c.salesRepId),
        ...c.emails,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, query, repName]);

  const selected = selectedId ? customers.find((c) => c.id === selectedId) || null : null;

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Internal</span>
          <h1>Customers</h1>
        </div>
        <span className="portal-row-actions">
          <button className="portal-btn" onClick={downloadCustomerTemplate} type="button">Download template</button>
          <button className="portal-btn" onClick={() => setImporting(true)} type="button">Import CSV</button>
          <button className="portal-btn" onClick={() => setManagingReps(true)} type="button">Manage sales reps</button>
          <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New customer</button>
        </span>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-toolbar">
        <input
          aria-label="Search customers"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, email, phone or rep"
          type="search"
          value={query}
        />
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Sales rep</th>
              <th>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="portal-link" onClick={() => setSelectedId(c.id)} type="button">
                      {customerTitle(c)}
                    </button>
                    {c.kind === "company" && c.pointOfContact ? (
                      <div className="portal-muted small">{c.pointOfContact}</div>
                    ) : null}
                  </td>
                  <td>{c.kind === "company" ? "Company" : "Individual"}</td>
                  <td>{c.emails[0] || ""}{c.emails.length > 1 ? ` +${c.emails.length - 1}` : ""}</td>
                  <td>{c.phone}</td>
                  <td>{repName(c.salesRepId)}</td>
                  <td>{c.subscribed ? <span className="portal-pill ok">Subscribed</span> : null}</td>
                </tr>
              ))
            ) : (
              <tr><td className="portal-col-empty" colSpan={6}>No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <CustomerModal close={() => setAdding(false)} customer={null} key="new" onSaved={reload} salesReps={salesReps} />
      ) : null}
      {selected ? (
        <CustomerModal close={() => setSelectedId(null)} customer={selected} key={selected.id} onSaved={reload} salesReps={salesReps} />
      ) : null}
      {managingReps ? <SalesRepsModal close={() => setManagingReps(false)} onChanged={reloadReps} salesReps={salesReps} /> : null}
      {importing ? <ImportCustomersForm close={() => setImporting(false)} onImported={reload} salesReps={salesReps} /> : null}
    </div>
  );
}

function CustomerModal({
  customer,
  close,
  onSaved,
  salesReps,
}: {
  customer: Customer | null;
  close: () => void;
  onSaved: () => Promise<void>;
  salesReps: SalesRep[];
}) {
  const [kind, setKind] = useState<CustomerKind>(customer?.kind || "company");
  const [form, setForm] = useState({
    companyName: customer?.companyName || "",
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
    phone: customer?.phone || "",
    pointOfContact: customer?.pointOfContact || "",
    notes: customer?.notes || "",
  });
  const [billing, setBilling] = useState<Address>(customer?.billingAddress || emptyAddress());
  const [shipping, setShipping] = useState<Address>(customer?.shippingAddress || emptyAddress());
  const [salesRepId, setSalesRepId] = useState(customer?.salesRepId != null ? String(customer.salesRepId) : "");
  const [subscribed, setSubscribed] = useState(customer?.subscribed || false);
  const [inventoryHeld, setInventoryHeld] = useState(customer?.inventoryHeld || false);
  const [emails, setEmails] = useState<string[]>(customer?.emails || []);
  const [emailDraft, setEmailDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function addEmail() {
    const value = emailDraft.trim();
    if (!value) return;
    if (!emails.includes(value)) setEmails([...emails, value]);
    setEmailDraft("");
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const named = kind === "company" ? form.companyName.trim() : `${form.firstName.trim()}${form.lastName.trim()}`;
    if (!named) {
      return setError(kind === "company" ? "Give the company a name." : "Give the customer a first or last name.");
    }
    const body = {
      kind,
      ...form,
      billingAddress: billing,
      shippingAddress: shipping,
      emails,
      salesRepId: salesRepId || null,
      subscribed,
      inventoryHeld,
    };
    void submit(() =>
      customer ? api("PATCH", `/api/portal/customers/${customer.id}`, body) : api("POST", "/api/portal/customers", body),
    );
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {customer ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this customer?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/customers/${customer.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{customer ? "Save" : "Add customer"}</button>
        </>
      }
      title={customer ? customerTitle(customer) : "New customer"}
    >
      <div className="portal-row" role="radiogroup" aria-label="Customer type">
        <label className="portal-check">
          <input checked={kind === "company"} name="kind" onChange={() => setKind("company")} type="radio" />
          Company
        </label>
        <label className="portal-check">
          <input checked={kind === "individual"} name="kind" onChange={() => setKind("individual")} type="radio" />
          Individual
        </label>
      </div>

      {kind === "company" ? (
        <label className="portal-field">Company name<input autoFocus onChange={set("companyName")} value={form.companyName} /></label>
      ) : (
        <div className="portal-row">
          <label className="portal-field">First name<input autoFocus onChange={set("firstName")} value={form.firstName} /></label>
          <label className="portal-field">Last name<input onChange={set("lastName")} value={form.lastName} /></label>
        </div>
      )}

      <AddressFields legend="Primary billing address" onChange={setBilling} value={billing} />
      <AddressFields legend="Primary shipping address" onChange={setShipping} value={shipping} />
      {customer ? <OtherShippingAddresses customerId={customer.id} onPrimaryChange={setShipping} /> : null}

      <label className="portal-field">
        Email address
        <div className="portal-inline">
          <input
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="name@company.com"
            type="email"
            value={emailDraft}
          />
          <button className="portal-btn small" onClick={addEmail} type="button">Add</button>
        </div>
      </label>
      {emails.length ? (
        <p className="portal-chips">
          {emails.map((e) => (
            <span className="portal-pill ok" key={e}>
              {e}{" "}
              <button
                aria-label={`Remove ${e}`}
                className="portal-pill-remove"
                onClick={() => setEmails(emails.filter((x) => x !== e))}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </p>
      ) : null}

      <div className="portal-row">
        <label className="portal-field">Phone number<input onChange={set("phone")} type="tel" value={form.phone} /></label>
        <label className="portal-field">Point of contact<input onChange={set("pointOfContact")} value={form.pointOfContact} /></label>
      </div>

      <div className="portal-row">
        <label className="portal-field">
          Sales rep
          <select onChange={(e) => setSalesRepId(e.target.value)} value={salesRepId}>
            <option value="">Unassigned</option>
            {salesReps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="portal-field">
          Inventory held?
          <select onChange={(e) => setInventoryHeld(e.target.value === "yes")} value={inventoryHeld ? "yes" : "no"}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </div>
      <label className="portal-check">
        <input checked={subscribed} onChange={(e) => setSubscribed(e.target.checked)} type="checkbox" />
        Subscribed to marketing emails
      </label>
      {inventoryHeld ? (
        <p className="portal-hint">This customer will appear in the &quot;Held by&quot; filter and item assignment on the Inventory tab.</p>
      ) : null}

      <label className="portal-field">Notes<textarea onChange={set("notes")} rows={3} value={form.notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

function SalesRepsModal({
  salesReps,
  close,
  onChanged,
}: {
  salesReps: SalesRep[];
  close: () => void;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const { busy, error, submit } = useSubmit(onChanged);

  return (
    <ModalFrame close={close} footer={<button className="portal-btn" onClick={close} type="button">Done</button>} title="Sales reps">
      <div className="portal-table-wrap">
        <table className="portal-table compact">
          <tbody>
            {salesReps.map((r) => (
              <tr key={r.id}>
                <td>
                  {editing?.id === r.id ? (
                    <input autoFocus onChange={(e) => setEditing({ id: r.id, name: e.target.value })} value={editing.name} />
                  ) : (
                    r.name
                  )}
                </td>
                <td className="r">
                  {confirming === r.id ? (
                    <span className="portal-row-actions">
                      <span className="portal-muted small">Remove?</span>
                      <button
                        className="portal-btn small danger"
                        disabled={busy}
                        onClick={() => void submit(() => api("DELETE", `/api/portal/sales-reps/${r.id}`))}
                        type="button"
                      >
                        Remove
                      </button>
                      <button className="portal-btn small" onClick={() => setConfirming(null)} type="button">Cancel</button>
                    </span>
                  ) : editing?.id === r.id ? (
                    <span className="portal-row-actions">
                      <button
                        className="portal-btn small primary"
                        disabled={busy}
                        onClick={() =>
                          void submit(async () => {
                            await api("PATCH", `/api/portal/sales-reps/${r.id}`, { name: editing.name });
                            setEditing(null);
                          })
                        }
                        type="button"
                      >
                        Save
                      </button>
                      <button className="portal-btn small" onClick={() => setEditing(null)} type="button">Cancel</button>
                    </span>
                  ) : (
                    <span className="portal-row-actions">
                      <button className="portal-btn small" onClick={() => setEditing({ id: r.id, name: r.name })} type="button">Rename</button>
                      <button className="portal-btn small danger" onClick={() => setConfirming(r.id)} type="button">Remove</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="portal-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void submit(async () => {
            await api("POST", "/api/portal/sales-reps", { name });
            setName("");
          });
        }}
      >
        <label className="portal-field">New sales rep<input onChange={(e) => setName(e.target.value)} value={name} /></label>
        <button className="portal-btn primary" disabled={busy || !name.trim()} type="submit">Add</button>
      </form>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

function ImportCustomersForm({
  salesReps,
  close,
  onImported,
}: {
  salesReps: SalesRep[];
  close: () => void;
  onImported: () => Promise<void>;
}) {
  const [textValue, setTextValue] = useState("");
  const [rows, setRows] = useState<ReturnType<typeof parseCustomerSheet>["rows"] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const { busy, error, submit } = useSubmit(async () => {
    await onImported();
    close();
  });

  const check = (value: string) => {
    const result = parseCustomerSheet(value, salesReps);
    setProblems(result.errors);
    setRows(result.errors.length ? null : result.rows);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rows?.length) void submit(() => api("POST", "/api/portal/customers", { rows }));
      }}
    >
      <ModalFrame
        close={close}
        footer={
          <>
            <button className="portal-btn" onClick={close} type="button">Cancel</button>
            <button className="portal-btn" onClick={() => check(textValue)} type="button">Check rows</button>
            <button className="portal-btn primary" disabled={busy || !rows?.length} type="submit">Import</button>
          </>
        }
        title="Import customers from a spreadsheet"
      >
        <p className="portal-hint">
          Paste rows copied from Excel or Google Sheets, or choose a CSV file. Columns in this order: <strong>Type,
          Company name, First name, Last name, Billing name/Address 1/Address 2/City/State/Zip/Country, Shipping
          name/Address 1/Address 2/City/State/Zip/Country, Email, Phone, Point of contact, Sales rep, Subscribed,
          Notes</strong>. A header row is fine, and columns can be in any order if it has one. Separate multiple
          emails with a semicolon. A sales rep name must match an existing one (see &quot;Manage sales reps&quot;)
          or that row is left unassigned. A row whose email matches an existing customer updates them instead of
          adding a duplicate. Need the format? <button className="portal-link" onClick={downloadCustomerTemplate} type="button">Download the template</button>.
        </p>
        <textarea
          aria-label="Rows to import"
          className="portal-mono"
          onChange={(e) => { setTextValue(e.target.value); setRows(null); setProblems([]); }}
          placeholder={CUSTOMER_TEMPLATE_HEADERS.join("\t")}
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
        {rows ? <p className="portal-msg ok">{rows.length} {rows.length === 1 ? "row" : "rows"} ready to import.</p> : null}
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
    </form>
  );
}
