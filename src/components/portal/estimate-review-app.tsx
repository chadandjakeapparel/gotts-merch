"use client";

import { useState } from "react";
import type { Estimate } from "@/lib/portal/types";
import { api } from "./api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_COPY: Record<Estimate["status"], { eyebrow: string; title: string }> = {
  draft: { eyebrow: "Estimate", title: "Your estimate" },
  sent: { eyebrow: "Awaiting your approval", title: "Review your estimate" },
  approved: { eyebrow: "Approved", title: "Estimate approved" },
  changes_requested: { eyebrow: "Changes requested", title: "We're updating your estimate" },
};

/** A customer's view of their one estimate -- approve it, or ask for changes. */
export function EstimateReviewApp({ initialEstimate, loadError }: { initialEstimate: Estimate | null; loadError: string }) {
  const [estimate, setEstimate] = useState(initialEstimate);
  const [error, setError] = useState(loadError);
  const [busy, setBusy] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [message, setMessage] = useState("");

  const reload = async () => {
    const res = await api<{ estimate: Estimate | null }>("GET", "/api/portal/estimates");
    setEstimate(res.estimate);
  };

  async function approve() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("POST", "/api/portal/estimates/approve");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitChanges(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("POST", "/api/portal/estimates/request-changes", { message });
      setRequestingChanges(false);
      setMessage("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!estimate) {
    return (
      <section className="portal-panel portal-empty">
        <h1>Estimates</h1>
        <p className="portal-muted">You don&apos;t have an estimate to review yet. We&apos;ll let you know as soon as one&apos;s ready.</p>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </section>
    );
  }

  const subtotal = estimate.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const total = subtotal + estimate.tax;
  const copy = STATUS_COPY[estimate.status];
  const canAct = estimate.status === "sent";

  return (
    <section className="portal-panel">
      <div className="portal-panel-head"><h2>{copy.eyebrow}</h2></div>
      <div className="portal-panel-body">
        <h1>{copy.title}</h1>

        {estimate.status === "changes_requested" ? (
          <p className="portal-msg warn">We&apos;ve received your requested changes and will follow up with an updated estimate.</p>
        ) : null}
        {estimate.status === "approved" ? (
          <p className="portal-msg ok">Thanks! Your job is on its way into production.</p>
        ) : null}

        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Line total</th></tr></thead>
            <tbody>
              {estimate.lineItems.map((li) => (
                <tr key={li.id}>
                  <td>{li.description}</td>
                  <td className="r">{li.quantity}</td>
                  <td className="r">{currency.format(li.unitPrice)}</td>
                  <td className="r">{currency.format(li.quantity * li.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Subtotal</td><td className="r">{currency.format(subtotal)}</td></tr>
              <tr><td colSpan={3}>Tax</td><td className="r">{currency.format(estimate.tax)}</td></tr>
              <tr><td colSpan={3}>Total</td><td className="r">{currency.format(total)}</td></tr>
            </tfoot>
          </table>
        </div>

        {estimate.notes ? <p className="portal-muted">{estimate.notes}</p> : null}

        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

        {canAct ? (
          requestingChanges ? (
            <form onSubmit={submitChanges}>
              <label className="portal-field">
                What would you like changed?
                <textarea autoFocus onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what to change…" rows={3} value={message} />
              </label>
              <div className="portal-row-actions">
                <button className="portal-btn" onClick={() => setRequestingChanges(false)} type="button">Cancel</button>
                <button className="portal-btn primary" disabled={busy || !message.trim()} type="submit">Submit</button>
              </div>
            </form>
          ) : (
            <div className="portal-row-actions">
              <button className="portal-btn" disabled={busy} onClick={() => setRequestingChanges(true)} type="button">Request changes</button>
              <button className="portal-btn primary" disabled={busy} onClick={approve} type="button">Approve</button>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
