"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Job } from "@/lib/portal/types";
import { api } from "./api";

const count = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });

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

const OPEN_STAGES: { key: Job["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_production", label: "In Production" },
  { key: "ready", label: "Ready" },
];

const STAGE_LABEL: Record<Job["status"], string> = {
  pending: "Pending",
  in_production: "In Production",
  ready: "Ready to Ship/Pickup",
  delivered: "Delivered",
};

const AGE_BUCKETS: { label: string; test: (days: number) => boolean }[] = [
  { label: "0-7 days", test: (d) => d <= 7 },
  { label: "8-14 days", test: (d) => d > 7 && d <= 14 },
  { label: "15-30 days", test: (d) => d > 14 && d <= 30 },
  { label: "31+ days", test: (d) => d > 30 },
];

type Bar = { key: string; label: string; value: number };

/** A small, card-sized bar chart: rounded tops, square baseline, value printed at each tip -- few enough bars (<=4) that direct labels replace a hover-only readout. */
function MiniBarChart({ bars, formatValue }: { bars: Bar[]; formatValue: (n: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const barW = 36;
  const gap = 18;
  const chartH = 64;
  const topPad = 16;
  const width = bars.length * barW + (bars.length - 1) * gap + 8;
  const r = 4;

  return (
    <svg className="portal-kpi-card__chart" role="img" viewBox={`0 0 ${width} ${topPad + chartH + 28}`}>
      <title>{bars.map((b) => `${b.label}: ${formatValue(b.value)}`).join(", ")}</title>
      {bars.map((b, i) => {
        const x = 4 + i * (barW + gap);
        const h = max > 0 ? Math.max(b.value > 0 ? 3 : 0, (b.value / max) * chartH) : 0;
        const y = topPad + (chartH - h);
        const baseline = topPad + chartH;
        const rr = Math.min(r, h / 2);
        return (
          <g key={b.key}>
            <path
              className="portal-kpi-bar"
              d={
                h > 0
                  ? `M${x + rr},${y} H${x + barW - rr} A${rr},${rr} 0 0 1 ${x + barW},${y + rr} V${baseline} H${x} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`
                  : `M${x},${baseline} H${x + barW} V${baseline} H${x} Z`
              }
            />
            <text className="portal-kpi-bar-value" textAnchor="middle" x={x + barW / 2} y={y - 4}>
              {formatValue(b.value)}
            </text>
            <text className="portal-kpi-bar-label" textAnchor="middle" x={x + barW / 2} y={baseline + 14}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The same chart, scaled up for the drill-down detail view. */
function BigBarChart({ bars, formatValue }: { bars: Bar[]; formatValue: (n: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const barW = 72;
  const gap = 36;
  const chartH = 160;
  const topPad = 24;
  const width = bars.length * barW + (bars.length - 1) * gap + 16;
  const r = 4;

  return (
    <svg role="img" style={{ width: "100%", maxWidth: 560, height: "auto" }} viewBox={`0 0 ${width} ${topPad + chartH + 36}`}>
      <title>{bars.map((b) => `${b.label}: ${formatValue(b.value)}`).join(", ")}</title>
      <line stroke="var(--p-line)" strokeWidth={1} x1={0} x2={width} y1={topPad + chartH} y2={topPad + chartH} />
      {bars.map((b, i) => {
        const x = 8 + i * (barW + gap);
        const h = max > 0 ? Math.max(b.value > 0 ? 3 : 0, (b.value / max) * chartH) : 0;
        const y = topPad + (chartH - h);
        const baseline = topPad + chartH;
        const rr = Math.min(r, h / 2);
        return (
          <g key={b.key}>
            <path
              className="portal-kpi-bar-big"
              d={
                h > 0
                  ? `M${x + rr},${y} H${x + barW - rr} A${rr},${rr} 0 0 1 ${x + barW},${y + rr} V${baseline} H${x} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`
                  : `M${x},${baseline} H${x + barW} V${baseline} H${x} Z`
              }
            />
            <text className="portal-kpi-bar-value" textAnchor="middle" x={x + barW / 2} y={y - 6}>
              {formatValue(b.value)}
            </text>
            <text className="portal-kpi-bar-label" textAnchor="middle" x={x + barW / 2} y={baseline + 18}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type MetricKey = "stage" | "value" | "age";

const METRIC_TITLE: Record<MetricKey, string> = {
  stage: "Open orders by stage",
  value: "Open order value by stage",
  age: "Open orders by age",
};

export function KpisApp({ initialJobs, loadError }: { initialJobs: Job[]; loadError: string }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState(loadError);
  const [refreshing, setRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") as MetricKey | null;

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

  const stageBars: Bar[] = OPEN_STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    value: openJobs.filter((j) => j.status === s.key).length,
  }));
  const valueBars: Bar[] = OPEN_STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    value: openJobs.filter((j) => j.status === s.key).reduce((sum, j) => sum + jobValue(j), 0),
  }));
  const ageBars: Bar[] = AGE_BUCKETS.map((b) => ({
    key: b.label,
    label: b.label,
    value: openJobs.filter((j) => b.test(daysOpen(j))).length,
  }));

  const detailJobs = [...openJobs].sort((a, b) => {
    if (view === "age") return daysOpen(b) - daysOpen(a);
    if (view === "value") return jobValue(b) - jobValue(a);
    return OPEN_STAGES.findIndex((s) => s.key === a.status) - OPEN_STAGES.findIndex((s) => s.key === b.status);
  });

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

      <div className="portal-kpi-grid">
        <Link className={`portal-kpi-card${view === "stage" ? " active" : ""}`} href="/portal/kpis?view=stage">
          <span className="portal-eyebrow">Open orders</span>
          <span className="portal-kpi-card__value">{count.format(openJobs.length)}</span>
          <MiniBarChart bars={stageBars} formatValue={(n) => count.format(n)} />
          <span className="portal-kpi-card__link">View breakdown →</span>
        </Link>
        <Link className={`portal-kpi-card${view === "value" ? " active" : ""}`} href="/portal/kpis?view=value">
          <span className="portal-eyebrow">Open order value</span>
          <span className="portal-kpi-card__value">{currency.format(openOrderValue)}</span>
          <MiniBarChart bars={valueBars} formatValue={(n) => compactCurrency.format(n)} />
          <span className="portal-kpi-card__link">View breakdown →</span>
        </Link>
        <Link className={`portal-kpi-card${view === "age" ? " active" : ""}`} href="/portal/kpis?view=age">
          <span className="portal-eyebrow">Days open (avg)</span>
          <span className="portal-kpi-card__value">{count.format(avgDaysOpen)}</span>
          <MiniBarChart bars={ageBars} formatValue={(n) => count.format(n)} />
          <span className="portal-kpi-card__link">View breakdown →</span>
        </Link>
      </div>

      {view ? (
        <section className="portal-kpi-detail">
          <div className="portal-title-row">
            <h2>{METRIC_TITLE[view]}</h2>
            <Link className="portal-link" href="/portal/kpis">← Back to overview</Link>
          </div>
          <div className="portal-kpi-detail__chart">
            <BigBarChart
              bars={view === "stage" ? stageBars : view === "value" ? valueBars : ageBars}
              formatValue={view === "value" ? (n) => compactCurrency.format(n) : (n) => count.format(n)}
            />
          </div>
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
                {detailJobs.length ? (
                  detailJobs.map((j) => (
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
      ) : null}
    </div>
  );
}
