"use client";

import { useState } from "react";
import type { BusinessAddress, BusinessInfo } from "@/lib/portal/business-info";
import { api } from "@/components/portal/api";
import { formatPhone } from "@/components/portal/phone";

function AddressFields({
  value,
  onChange,
}: {
  value: BusinessAddress;
  onChange: (next: BusinessAddress) => void;
}) {
  const set = (k: keyof BusinessAddress) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <label className="portal-field">Address line 1<input onChange={set("line1")} value={value.line1} /></label>
      <label className="portal-field">Address line 2<input onChange={set("line2")} value={value.line2} /></label>
      <div className="portal-row">
        <label className="portal-field">City<input onChange={set("city")} value={value.city} /></label>
        <label className="portal-field">State<input onChange={set("state")} value={value.state} /></label>
        <label className="portal-field">Zip code<input onChange={set("zip")} value={value.zip} /></label>
      </div>
    </>
  );
}

export function BusinessInfoApp({ initial }: { initial: BusinessInfo }) {
  const [form, setForm] = useState<BusinessInfo>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  function update<K extends keyof BusinessInfo>(key: K, value: BusinessInfo[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaveState("saving");
    setError("");
    try {
      await api("PATCH", "/api/portal/admin/business-info", form);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <form className="portal-crm" onSubmit={handleSave}>
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Business information</h1>
        </div>
      </div>
      <p className="portal-hint">
        Your letterhead details -- used on estimate PDFs and wherever else the portal needs them.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section className="portal-panel">
        <div className="portal-panel-head"><h2>Business</h2></div>
        <div className="portal-panel-body">
          <label className="portal-field">
            Business name
            <input onChange={(e) => update("businessName", e.target.value)} value={form.businessName} />
          </label>
          <AddressFields onChange={(address) => update("address", address)} value={form.address} />
          <div className="portal-row">
            <label className="portal-field">
              Business email
              <input onChange={(e) => update("email", e.target.value)} type="email" value={form.email} />
            </label>
            <label className="portal-field">
              Phone number
              <input onBlur={(e) => update("phone", formatPhone(e.target.value))} onChange={(e) => update("phone", e.target.value)} type="tel" value={form.phone} />
            </label>
            <label className="portal-field">
              EIN
              <input onChange={(e) => update("ein", e.target.value)} placeholder="12-3456789" value={form.ein} />
            </label>
          </div>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Remit-to address</h2>
          <button
            className="portal-btn small"
            onClick={() => update("remitAddress", { ...form.address })}
            type="button"
          >
            Same as business address
          </button>
        </div>
        <div className="portal-panel-body">
          <p className="portal-hint">Where customers should mail checks, if different from the business address above.</p>
          <AddressFields onChange={(remitAddress) => update("remitAddress", remitAddress)} value={form.remitAddress} />
        </div>
      </section>

      <div className="portal-row">
        <button className="portal-btn primary" disabled={saveState === "saving"} type="submit">
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>
        {saveState === "saved" ? <p className="portal-msg ok">Saved ✓</p> : null}
      </div>
    </form>
  );
}
