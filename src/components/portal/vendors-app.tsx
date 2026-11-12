"use client";

import { useEffect, useRef, useState } from "react";
import type { Vendor } from "@/lib/portal/types";
import { api } from "./api";
import { formatPhone } from "./phone";

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

export function VendorsApp({ initialVendors, loadError }: { initialVendors: Vendor[]; loadError: string }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState(loadError);
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  const reload = async () => {
    try {
      const res = await api<{ vendors: Vendor[] }>("GET", "/api/portal/vendors");
      setVendors(res.vendors);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vendors couldn't be loaded.");
    }
  };

  return (
    <div className="portal-admin">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Vendors</h1>
        </div>
        <button className="portal-btn primary" onClick={() => setEditing("new")} type="button">Add vendor</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section className="portal-panel">
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>City, State</th></tr>
            </thead>
            <tbody>
              {vendors.length ? (
                vendors.map((v) => (
                  <tr key={v.id}>
                    <td><button className="portal-link" onClick={() => setEditing(v)} type="button">{v.name || "Untitled vendor"}</button></td>
                    <td>{v.contactName || <span className="portal-muted">—</span>}</td>
                    <td>{v.email || <span className="portal-muted">—</span>}</td>
                    <td>{v.phone || <span className="portal-muted">—</span>}</td>
                    <td>{[v.address.city, v.address.state].filter(Boolean).join(", ") || <span className="portal-muted">—</span>}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="portal-muted" colSpan={5}>No vendors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <VendorEditModal close={() => setEditing(null)} onSaved={reload} vendor={editing === "new" ? null : editing} />
      ) : null}
    </div>
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

  const lastZipLookup = useRef("");
  const [zipStatus, setZipStatus] = useState<"idle" | "looking" | "miss">("idle");

  async function lookupZip() {
    const zip = form.address.zip.trim();
    if (!/^\d{5}$/.test(zip) || zip === lastZipLookup.current) return;
    lastZipLookup.current = zip;
    setZipStatus("looking");
    try {
      const res = await api<{ city: string; state: string }>("GET", `/api/portal/zip-lookup?zip=${zip}`);
      setForm((f) => ({ ...f, address: { ...f.address, zip, city: res.city || f.address.city, state: res.state || f.address.state } }));
      setZipStatus("idle");
    } catch {
      setZipStatus("miss");
    }
  }

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
        <label className="portal-field">Phone<input onBlur={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} onChange={(e) => setForm({ ...form, phone: e.target.value })} value={form.phone} /></label>
      </div>
      <label className="portal-field">Address line 1<input onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })} value={form.address.line1} /></label>
      <label className="portal-field">Address line 2<input onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })} value={form.address.line2} /></label>
      <div className="portal-row">
        <label className="portal-field">
          Zip<input inputMode="numeric" onBlur={lookupZip} onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })} value={form.address.zip} />
        </label>
        <label className="portal-field">City<input onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} value={form.address.city} /></label>
        <label className="portal-field">State<input onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} value={form.address.state} /></label>
      </div>
      {zipStatus === "miss" ? <p className="portal-hint">Couldn&apos;t look up that ZIP code -- enter the city and state yourself.</p> : null}
      <label className="portal-field">Notes<textarea onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} value={form.notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}
