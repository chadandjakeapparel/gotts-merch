"use client";

import { useState } from "react";
import type { Job } from "@/lib/portal/types";
import { api } from "./api";

const count = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Same shape as jobTotals() in lib/portal/jobs.ts, recomputed here so this client component doesn't pull in server-only db code. */
function jobValue(job: Job): number {
  const subtotal = job.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxableSubtotal = job.lineItems.filter((li) => li.taxable).reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = Math.round(taxableSubtotal * (job.taxRate / 100) * 100) / 100;
  return subtotal + tax;
}

function daysOpen(job: Job): number {
  const created = new Date(job.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
}

function fmtCreatedDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STAGE_LABEL: Record<Job["status"], string> = {
  pending: "Pending",
  in_production: "In Production",
  ready: "Ready to Ship/Pickup",
  delivered: "Delivered",
};

export function KpisApp({ initialJobs, loadError }: { initialJobs: Job[]; loadError: string }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState(loadError);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await api<{ jobs: Job[] }>("GET", "/api/portal/jobs");
      setJobs(res.jobs);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "KPIs couldn't be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  const openJobs = jobs.filter((j) => j.status !== "delivered");
  const openOrderValue = openJobs.reduce((sum, j) => sum + jobValue(j), 0);
  const avgDaysOpen = openJobs.length ? Math.round(openJobs.reduce((sum, j) => sum + daysOpen(j), 0) / openJobs.length) : 0;
  const oldestOpen = openJobs.length ? Math.max(...openJobs.map(daysOpen)) : 0;

  const byAge = [...openJobs].sort((a, b) => daysOpen(b) - daysOpen(a));

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>KPIs</h1>
        </div>
        <button className="portal-btn" disabled={refreshing} onClick={() => void refresh()} type="button">
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section aria-label="Key metrics" className="portal-summary">
        <div><span className="portal-eyebrow">Open orders</span><strong>{count.format(openJobs.length)}</strong></div>
        <div><span className="portal-eyebrow">Open order value</span><strong>{currency.format(openOrderValue)}</strong></div>
        <div><span className="portal-eyebrow">Avg days open</span><strong>{count.format(avgDaysOpen)}</strong></div>
        <div><span className="portal-eyebrow">Oldest open order</span><strong>{count.format(oldestOpen)} days</strong></div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head"><h2>Open orders by age</h2></div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Stage</th>
                <th className="r">Value</th>
                <th>Created</th>
                <th className="r">Days open</th>
              </tr>
            </thead>
            <tbody>
              {byAge.length ? (
                byAge.map((j) => (
                  <tr key={j.id}>
                    <td>{j.jobName || "Untitled job"}{j.salesOrderNumber ? <span className="portal-muted small"> · {j.salesOrderNumber}</span> : null}</td>
                    <td><span className="portal-badge">{STAGE_LABEL[j.status]}</span></td>
                    <td className="r">{currency.format(jobValue(j))}</td>
                    <td>{fmtCreatedDate(j.createdAt)}</td>
                    <td className="r">{count.format(daysOpen(j))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="portal-col-empty" colSpan={5}>No open orders.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
