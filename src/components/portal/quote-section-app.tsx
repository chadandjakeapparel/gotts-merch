"use client";

import { useState } from "react";
import type { QuoteSection } from "@/lib/portal/quote-section";
import { api } from "@/components/portal/api";

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function QuoteSectionApp({ initial }: { initial: QuoteSection }) {
  const [form, setForm] = useState<QuoteSection>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  function update<K extends keyof QuoteSection>(key: K, value: QuoteSection[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaveState("saving");
    setError("");
    try {
      await api("PATCH", "/api/portal/admin/quote-section", form);
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
          <h1>Get a Quote section</h1>
        </div>
      </div>
      <p className="portal-hint">
        The section at the bottom of the homepage, and every dropdown/checkbox option on its form.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Section copy</h2>
        </div>
        <div className="portal-panel-body">
          <label className="portal-field">
            Eyebrow
            <input onChange={(e) => update("eyebrow", e.target.value)} value={form.eyebrow} />
          </label>
          <label className="portal-field">
            Title
            <input onChange={(e) => update("title", e.target.value)} value={form.title} />
          </label>
          <label className="portal-field">
            Body
            <textarea onChange={(e) => update("body", e.target.value)} rows={3} value={form.body} />
          </label>
          <label className="portal-field">
            Note (shown below the form -- e.g. a customer quote)
            <textarea onChange={(e) => update("note", e.target.value)} rows={2} value={form.note} />
          </label>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Venue type options</h2>
        </div>
        <div className="portal-panel-body">
          <label className="portal-field">
            One per line
            <textarea
              onChange={(e) => update("venueTypes", textToList(e.target.value))}
              rows={8}
              value={listToText(form.venueTypes)}
            />
          </label>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Estimated quantity options</h2>
        </div>
        <div className="portal-panel-body">
          <label className="portal-field">
            One per line
            <textarea
              onChange={(e) => update("quantities", textToList(e.target.value))}
              rows={5}
              value={listToText(form.quantities)}
            />
          </label>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>&quot;What are you looking for?&quot; checkboxes</h2>
        </div>
        <div className="portal-panel-body">
          <label className="portal-field">
            One per line
            <textarea
              onChange={(e) => update("productOptions", textToList(e.target.value))}
              rows={6}
              value={listToText(form.productOptions)}
            />
          </label>
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
