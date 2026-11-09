"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Customer, Job, PurchaseOrder, PurchaseOrderStatus, Vendor } from "@/lib/portal/types";
import { api } from "./api";

const count = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  cancelled: "Cancelled",
};

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function poTotal(po: Pick<PurchaseOrder, "lines">) {
  return po.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
}

/** The number staff and vendors see -- the stored po_number is a plain sequential integer; "GM" is a display-only prefix. */
function poLabel(poNumber: number) {
  return `GM${poNumber}`;
}

function fmtFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function ModalFrame({ title, children, footer, close, wide }: { title: string; children: React.ReactNode; footer: React.ReactNode; close: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="portal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div aria-modal="true" className={`portal-modal${wide ? " portal-modal-wide" : ""}`} role="dialog">
        <div className="portal-modal-head"><h2>{title}</h2></div>
        <div className="portal-modal-body">{children}</div>
        <div className="portal-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

function jobLabel(job: Job, customers: Customer[]) {
  const customer = customers.find((c) => c.id === job.customerId);
  const customerName = customer ? (customer.kind === "company" ? customer.companyName : [customer.firstName, customer.lastName].filter(Boolean).join(" ")) : "";
  const parts = [job.salesOrderNumber || `Job #${job.id}`, job.jobName || "Untitled job", customerName].filter(Boolean);
  return parts.join(" — ");
}

export function PurchaseOrdersApp({
  initialPurchaseOrders,
  initialVendors,
  jobs,
  customers,
  loadError,
}: {
  initialPurchaseOrders: PurchaseOrder[];
  initialVendors: Vendor[];
  jobs: Job[];
  customers: Customer[];
  loadError: string;
}) {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState(loadError);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [managingVendors, setManagingVendors] = useState(false);

  const reload = async () => {
    try {
      const res = await api<{ purchaseOrders: PurchaseOrder[] }>("GET", "/api/portal/purchase-orders");
      setPurchaseOrders(res.purchaseOrders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase orders couldn't be loaded.");
    }
  };

  const reloadVendors = async () => {
    const res = await api<{ vendors: Vendor[] }>("GET", "/api/portal/vendors");
    setVendors(res.vendors);
  };

  const vendorName = (id: number | null) => vendors.find((v) => v.id === id)?.name || "";
  const jobsFor = (ids: number[]) => ids.map((id) => jobs.find((j) => j.id === id)).filter((j): j is Job => Boolean(j));
  const selected = selectedId ? purchaseOrders.find((p) => p.id === selectedId) || null : null;

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Purchase Orders</h1>
        </div>
        <span className="portal-row-actions">
          <button className="portal-btn" onClick={() => setManagingVendors(true)} type="button">Manage vendors</button>
          <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New purchase order</button>
        </span>
      </div>
      <p className="portal-hint">{count.format(purchaseOrders.length)} {purchaseOrders.length === 1 ? "purchase order" : "purchase orders"}.</p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Vendor</th>
              <th>Sales order</th>
              <th>Status</th>
              <th className="r">Total</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length ? (
              purchaseOrders.map((po) => {
                const linkedJobs = jobsFor(po.jobIds);
                return (
                  <tr key={po.id}>
                    <td>
                      <button className="portal-link" onClick={() => setSelectedId(po.id)} type="button">PO #{poLabel(po.poNumber)}</button>
                    </td>
                    <td>{vendorName(po.vendorId) || <span className="portal-muted">No vendor</span>}</td>
                    <td>
                      {linkedJobs.length ? (
                        linkedJobs.map((j) => j.salesOrderNumber || `Job #${j.id}`).join(", ")
                      ) : (
                        <span className="portal-muted">Not linked</span>
                      )}
                    </td>
                    <td><span className={`portal-badge${po.status === "received" ? " ok" : ""}`}>{STATUS_LABEL[po.status]}</span></td>
                    <td className="r">{money.format(poTotal(po))}</td>
                    <td>{fmtDate(po.updatedAt)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="portal-col-empty" colSpan={6}>No purchase orders yet -- add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <PurchaseOrderModal close={() => setAdding(false)} customers={customers} jobs={jobs} onSaved={reload} purchaseOrder={null} vendors={vendors} />
      ) : null}
      {selected ? (
        <PurchaseOrderModal
          close={() => setSelectedId(null)}
          customers={customers}
          jobs={jobs}
          key={selected.id}
          onSaved={reload}
          purchaseOrder={selected}
          vendors={vendors}
        />
      ) : null}
      {managingVendors ? <VendorsModal close={() => setManagingVendors(false)} onChanged={reloadVendors} vendors={vendors} /> : null}
    </div>
  );
}

type LineForm = { itemName: string; description: string; color: string; size: string; quantity: string; unitCost: string };

function emptyLine(): LineForm {
  return { itemName: "", description: "", color: "", size: "", quantity: "1", unitCost: "0" };
}

function PurchaseOrderModal({
  purchaseOrder,
  vendors,
  jobs,
  customers,
  close,
  onSaved,
}: {
  purchaseOrder: PurchaseOrder | null;
  vendors: Vendor[];
  jobs: Job[];
  customers: Customer[];
  close: () => void;
  onSaved: () => Promise<void>;
}) {
  const [vendorId, setVendorId] = useState(purchaseOrder?.vendorId != null ? String(purchaseOrder.vendorId) : "");
  const [jobIds, setJobIds] = useState<number[]>(purchaseOrder?.jobIds || []);
  const [status, setStatus] = useState<PurchaseOrderStatus>(purchaseOrder?.status || "draft");
  const [notes, setNotes] = useState(purchaseOrder?.notes || "");
  const [lines, setLines] = useState<LineForm[]>(
    purchaseOrder?.lines.length
      ? purchaseOrder.lines.map((l) => ({
          itemName: l.itemName,
          description: l.description,
          color: l.color,
          size: l.size,
          quantity: String(l.quantity),
          unitCost: String(l.unitCost),
        }))
      : [emptyLine()],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) return setError("Choose a vendor for this purchase order.");
    const payload = {
      vendorId: Number(vendorId),
      jobIds,
      status,
      notes,
      lines: lines
        .filter((l) => l.itemName.trim() || l.description.trim())
        .map((l) => ({
          itemName: l.itemName,
          description: l.description,
          color: l.color,
          size: l.size,
          quantity: Number(l.quantity) || 0,
          unitCost: Number(l.unitCost) || 0,
        })),
    };
    void submit(() =>
      purchaseOrder
        ? api("PATCH", `/api/portal/purchase-orders/${purchaseOrder.id}`, payload)
        : api("POST", "/api/portal/purchase-orders", payload),
    );
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {purchaseOrder ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this purchase order?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/purchase-orders/${purchaseOrder.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{purchaseOrder ? "Save" : "Create purchase order"}</button>
        </>
      }
      title={purchaseOrder ? `PO #${poLabel(purchaseOrder.poNumber)}` : "New purchase order"}
      wide
    >
      <div className="portal-row">
        <label className="portal-field">
          Vendor
          <select onChange={(e) => setVendorId(e.target.value)} value={vendorId}>
            <option value="">Choose a vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="portal-field">
          Status
          <select onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)} value={status}>
            {(Object.keys(STATUS_LABEL) as PurchaseOrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <label className="portal-field">
        Sales orders (optional — select every job this PO is ordering goods for)
        <select
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) setJobIds((current) => (current.includes(id) ? current : [...current, id]));
            e.target.value = "";
          }}
          value=""
        >
          <option value="">Add a sales order…</option>
          {jobs.filter((j) => !jobIds.includes(j.id)).map((j) => <option key={j.id} value={j.id}>{jobLabel(j, customers)}</option>)}
        </select>
      </label>
      {jobIds.length ? (
        <p className="portal-chips">
          {jobIds.map((id) => {
            const job = jobs.find((j) => j.id === id);
            return (
              <span className="portal-pill ok" key={id}>
                {job ? jobLabel(job, customers) : `Job #${id}`}{" "}
                <button
                  aria-label="Remove this sales order"
                  className="portal-pill-remove"
                  onClick={() => setJobIds(jobIds.filter((x) => x !== id))}
                  type="button"
                >
                  ×
                </button>
              </span>
            );
          })}
        </p>
      ) : null}

      <div className="portal-lines">
        {lines.map((l, i) => (
          <div className="portal-row" key={i}>
            <label className="portal-field">Item<input onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, itemName: e.target.value } : x)))} value={l.itemName} /></label>
            <label className="portal-field">Description<input onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} value={l.description} /></label>
            <label className="portal-field">Color<input onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} value={l.color} /></label>
            <label className="portal-field">Size<input onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} value={l.size} /></label>
            <label className="portal-field">
              Qty
              <input min={0} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} type="number" value={l.quantity} />
            </label>
            <label className="portal-field">
              Unit cost ($)
              <input min={0} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} step={0.01} type="number" value={l.unitCost} />
            </label>
            <button className="portal-x" onClick={() => setLines(lines.filter((_, j) => j !== i))} title="Remove line" type="button">×</button>
          </div>
        ))}
        <button className="portal-link" onClick={() => setLines([...lines, emptyLine()])} type="button">+ Add line</button>
      </div>
      <div className="portal-totals"><span>Total</span><span>{money.format(total)}</span></div>

      <label className="portal-field">Notes<textarea onChange={(e) => setNotes(e.target.value)} rows={3} value={notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      {purchaseOrder ? <PurchaseOrderFilesSection onChanged={onSaved} purchaseOrder={purchaseOrder} /> : null}
    </ModalFrame>
  );
}

/** Drag-and-drop (or click to browse) document uploads for a purchase order -- stored in Files under Purchase Order / PO #GM<n>, created the first time a file lands here. */
function PurchaseOrderFilesSection({ purchaseOrder, onChanged }: { purchaseOrder: PurchaseOrder; onChanged: () => Promise<void> }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/portal/purchase-orders/${purchaseOrder.id}/files`, { method: "POST", body: formData });
        const data = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed");
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(fileId: number) {
    setRemovingId(fileId);
    setError("");
    try {
      await api("DELETE", `/api/portal/purchase-orders/${purchaseOrder.id}/files/${fileId}`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that file.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="portal-files-section">
      <span className="portal-eyebrow">Files</span>
      <label
        className={`portal-dropzone${dragOver ? " drag-over" : ""}`}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <input
          multiple
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
          type="file"
        />
        <span>{uploading ? "Uploading…" : "Drag files here, or click to browse"}</span>
      </label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      {purchaseOrder.files.length ? (
        <ul className="portal-file-list">
          {purchaseOrder.files.map((f) => (
            <li key={f.id}>
              <a href={f.url} rel="noreferrer" target="_blank">{f.fileName}</a>
              <span className="portal-muted small">{fmtFileSize(f.size)}</span>
              <button
                aria-label={`Remove ${f.fileName}`}
                disabled={removingId === f.id}
                onClick={() => void removeFile(f.id)}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-muted small">No files yet.</p>
      )}
      {purchaseOrder.folderId != null ? (
        <Link className="portal-link" href={`/portal/files/${purchaseOrder.folderId}`}>View in Files →</Link>
      ) : null}
    </div>
  );
}

function VendorsModal({ vendors, close, onChanged }: { vendors: Vendor[]; close: () => void; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  if (editing) {
    return <VendorEditModal close={() => setEditing(null)} onSaved={onChanged} vendor={editing === "new" ? null : editing} />;
  }

  return (
    <ModalFrame
      close={close}
      footer={<button className="portal-btn primary" onClick={close} type="button">Done</button>}
      title="Vendors"
    >
      <button className="portal-btn" onClick={() => setEditing("new")} type="button">Add vendor</button>
      <ul className="portal-address-list">
        {vendors.length ? (
          vendors.map((v) => (
            <li key={v.id}>
              <button className="portal-link" onClick={() => setEditing(v)} type="button">{v.name}</button>
              {v.contactName ? <span className="portal-muted small"> — {v.contactName}</span> : null}
            </li>
          ))
        ) : (
          <li className="portal-muted small">No vendors yet.</li>
        )}
      </ul>
    </ModalFrame>
  );
}

function VendorEditModal({ vendor, close, onSaved }: { vendor: Vendor | null; close: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: vendor?.name || "",
    contactName: vendor?.contactName || "",
    email: vendor?.email || "",
    phone: vendor?.phone || "",
    address: vendor?.address || { name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US" },
    notes: vendor?.notes || "",
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Give the vendor a name.");
    void submit(() => (vendor ? api("PATCH", `/api/portal/vendors/${vendor.id}`, form) : api("POST", "/api/portal/vendors", form)));
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {vendor ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this vendor?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/vendors/${vendor.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{vendor ? "Save" : "Add vendor"}</button>
        </>
      }
      title={vendor ? vendor.name || "Untitled vendor" : "New vendor"}
    >
      <label className="portal-field">Vendor name<input autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} value={form.name} /></label>
      <div className="portal-row">
        <label className="portal-field">Contact name<input onChange={(e) => setForm({ ...form, contactName: e.target.value })} value={form.contactName} /></label>
        <label className="portal-field">Email<input onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" value={form.email} /></label>
        <label className="portal-field">Phone<input onChange={(e) => setForm({ ...form, phone: e.target.value })} value={form.phone} /></label>
      </div>
      <label className="portal-field">Address line 1<input onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })} value={form.address.line1} /></label>
      <label className="portal-field">Address line 2<input onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })} value={form.address.line2} /></label>
      <div className="portal-row">
        <label className="portal-field">City<input onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} value={form.address.city} /></label>
        <label className="portal-field">State<input onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} value={form.address.state} /></label>
        <label className="portal-field">Zip<input onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })} value={form.address.zip} /></label>
      </div>
      <label className="portal-field">Notes<textarea onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} value={form.notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}
