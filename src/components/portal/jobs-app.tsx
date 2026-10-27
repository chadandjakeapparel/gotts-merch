"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer, Job, JobStatus, SalesRep } from "@/lib/portal/types";
import { api } from "./api";
import { CustomerModal, customerTitle } from "./customers-app";

const count = new Intl.NumberFormat("en-US");

const STAGES: { key: JobStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_production", label: "In Production" },
  { key: "ready", label: "Ready to Ship/Pickup" },
  { key: "delivered", label: "Delivered" },
];

/** Parses a "YYYY-MM-DD" date as a local date, so it never shifts a day off in formatting. */
function fmtInHandDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export function JobsApp({
  initialJobs,
  initialCustomers,
  initialSalesReps,
  loadError,
}: {
  initialJobs: Job[];
  initialCustomers: Customer[];
  initialSalesReps: SalesRep[];
  loadError: string;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [customers, setCustomers] = useState(initialCustomers);
  const salesReps = initialSalesReps;
  const [error, setError] = useState(loadError);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<JobStatus | null>(null);
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");

  const reload = async () => {
    try {
      const res = await api<{ jobs: Job[] }>("GET", "/api/portal/jobs");
      setJobs(res.jobs);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The job board couldn't be refreshed.");
    }
  };

  const reloadCustomers = async () => {
    const res = await api<{ customers: Customer[] }>("GET", "/api/portal/customers");
    setCustomers(res.customers);
    return res.customers;
  };

  /** Moves a job to a stage by drag and drop, updating right away and reverting if the save fails. */
  async function moveJob(jobId: number, status: JobStatus) {
    const previous = jobs;
    const job = previous.find((j) => j.id === jobId);
    if (!job || job.status === status) return;
    setJobs((current) => current.map((j) => (j.id === jobId ? { ...j, status } : j)));
    try {
      await api("PATCH", `/api/portal/jobs/${jobId}/status`, { status });
    } catch (err) {
      setJobs(previous);
      setError(err instanceof Error ? err.message : "Couldn't move that job. Try again.");
    }
  }

  const customerName = useMemo(() => {
    const m = new Map(customers.map((c) => [c.id, customerTitle(c)]));
    return (id: number | null) => (id == null ? "" : m.get(id) || "Unknown customer");
  }, [customers]);

  const suggestions = useMemo(
    () => ({
      decorationTypes: [...new Set(jobs.map((j) => j.decorationType).filter(Boolean))],
      productionFacilities: [...new Set(jobs.map((j) => j.productionFacility).filter(Boolean))],
    }),
    [jobs],
  );

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, name: customerTitle(c) })).sort((a, b) => a.name.localeCompare(b.name)),
    [customers],
  );

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (customerFilter && String(j.customerId) !== customerFilter) return false;
      if (jobTypeFilter && j.decorationType !== jobTypeFilter) return false;
      if (!q) return true;
      const haystack = [
        j.jobName,
        customerName(j.customerId),
        j.contactName,
        j.poNumbers,
        j.decorationType,
        j.productionFacility,
        j.inHandDate ? fmtInHandDate(j.inHandDate) : "",
        j.goodsOrdered ? "goods ordered" : "goods not ordered",
        String(j.quantity),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [jobs, query, customerFilter, jobTypeFilter, customerName]);

  const byStage = useMemo(() => {
    const m = new Map<JobStatus, Job[]>(STAGES.map((s) => [s.key, [] as Job[]]));
    for (const j of filteredJobs) m.get(j.status)?.push(j);
    return m;
  }, [filteredJobs]);

  const totals = useMemo(() => {
    const active = jobs.filter((j) => j.status !== "delivered");
    return {
      active: active.length,
      awaitingGoods: active.filter((j) => !j.goodsOrdered).length,
      ready: jobs.filter((j) => j.status === "ready").length,
      delivered: jobs.filter((j) => j.status === "delivered").length,
    };
  }, [jobs]);

  const selected = selectedId ? jobs.find((j) => j.id === selectedId) || null : null;

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Internal</span>
          <h1>Job Board</h1>
        </div>
        <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New job</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section aria-label="Totals" className="portal-summary">
        <div><span className="portal-eyebrow">Active jobs</span><strong>{count.format(totals.active)}</strong></div>
        <div><span className="portal-eyebrow">Awaiting goods</span><strong>{count.format(totals.awaitingGoods)}</strong></div>
        <div><span className="portal-eyebrow">Ready to ship/pickup</span><strong>{count.format(totals.ready)}</strong></div>
        <div><span className="portal-eyebrow">Delivered</span><strong>{count.format(totals.delivered)}</strong></div>
      </section>

      <div className="portal-toolbar">
        <input
          aria-label="Search jobs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search job name, customer, contact, PO #, decoration, facility…"
          type="search"
          value={query}
        />
        <select aria-label="Filter by customer" onChange={(e) => setCustomerFilter(e.target.value)} value={customerFilter}>
          <option value="">All customers</option>
          {customerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by job type" onChange={(e) => setJobTypeFilter(e.target.value)} value={jobTypeFilter}>
          <option value="">All job types</option>
          {suggestions.decorationTypes.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="portal-board">
        {STAGES.map((s) => {
          const items = byStage.get(s.key) || [];
          return (
            <div className={`portal-col ${s.key}`} key={s.key}>
              <div className="portal-col-head">
                <h3>{s.label}</h3>
                <span className="portal-count">{items.length}</span>
              </div>
              <div
                className={`portal-cards${dragOverStage === s.key ? " drag-over" : ""}`}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage((current) => (current === s.key ? null : current));
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== s.key) setDragOverStage(s.key);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  if (id) void moveJob(id, s.key);
                }}
              >
                {items.length ? (
                  items.map((j) => (
                    <button
                      className={`portal-card${draggingId === j.id ? " dragging" : ""}`}
                      draggable
                      key={j.id}
                      onClick={() => setSelectedId(j.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onDragStart={(e) => {
                        setDraggingId(j.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(j.id));
                      }}
                      type="button"
                    >
                      <h4>{customerName(j.customerId) || "Unassigned customer"}</h4>
                      <p className="portal-card-jobname">{j.jobName || "Untitled job"}</p>
                      <div className="portal-card-meta">
                        <span className="portal-muted">{j.inHandDate ? fmtInHandDate(j.inHandDate) : "No in-hand date"}</span>
                        <span className={`portal-pill ${j.goodsOrdered ? "ok" : "warn"}`}>
                          Goods {j.goodsOrdered ? "ordered" : "not ordered"}
                        </span>
                      </div>
                      <div className="portal-card-foot">
                        <span className="portal-muted">{j.decorationType || "No decoration set"}</span>
                        {j.quantity ? <span>{count.format(j.quantity)} pcs</span> : null}
                      </div>
                      <span className="portal-job-tip">
                        <strong>{j.jobName || "Untitled job"}</strong>
                        <span>{j.inHandDate ? `In hand ${fmtInHandDate(j.inHandDate)}` : "No in-hand date set"}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="portal-col-empty">No jobs</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <JobModal
          close={() => setAdding(false)}
          customers={customers}
          job={null}
          onSaved={reload}
          reloadCustomers={reloadCustomers}
          salesReps={salesReps}
          suggestions={suggestions}
        />
      ) : null}
      {selected ? (
        <JobModal
          close={() => setSelectedId(null)}
          customers={customers}
          job={selected}
          key={selected.id}
          onSaved={reload}
          reloadCustomers={reloadCustomers}
          salesReps={salesReps}
          suggestions={suggestions}
        />
      ) : null}
    </div>
  );
}

function JobModal({
  job,
  close,
  onSaved,
  customers,
  salesReps,
  reloadCustomers,
  suggestions,
}: {
  job: Job | null;
  close: () => void;
  onSaved: () => Promise<void>;
  customers: Customer[];
  salesReps: SalesRep[];
  reloadCustomers: () => Promise<Customer[]>;
  suggestions: { decorationTypes: string[]; productionFacilities: string[] };
}) {
  const [customerId, setCustomerId] = useState(job?.customerId != null ? String(job.customerId) : "");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [form, setForm] = useState({
    jobName: job?.jobName || "",
    contactName: job?.contactName || "",
    inHandDate: job?.inHandDate || "",
    poNumbers: job?.poNumbers || "",
    decorationType: job?.decorationType || "",
    quantity: String(job?.quantity ?? 0),
    productionFacility: job?.productionFacility || "",
  });
  const [goodsOrdered, setGoodsOrdered] = useState(job?.goodsOrdered || false);
  const [status, setStatus] = useState<JobStatus>(job?.status || "pending");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function handleCustomerCreated() {
    const before = new Set(customers.map((c) => c.id));
    const fresh = await reloadCustomers();
    const added = fresh.find((c) => !before.has(c.id));
    if (added) setCustomerId(String(added.id));
    setCreatingCustomer(false);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Choose a customer for this job.");
    if (!form.jobName.trim()) return setError("Give the job a name.");
    const body: Record<string, unknown> = {
      customerId,
      ...form,
      goodsOrdered,
    };
    if (job) body.status = status;
    void submit(() => (job ? api("PATCH", `/api/portal/jobs/${job.id}`, body) : api("POST", "/api/portal/jobs", body)));
  }

  return (
    <>
      <ModalFrame
        close={close}
        footer={
          <>
            {job ? (
              confirmingDelete ? (
                <span className="portal-row-actions push-left">
                  <span className="portal-muted small">Delete this job?</span>
                  <button
                    className="portal-btn small danger"
                    disabled={busy}
                    onClick={() => void submit(() => api("DELETE", `/api/portal/jobs/${job.id}`))}
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
            <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{job ? "Save" : "Add job"}</button>
          </>
        }
        title={job ? (job.jobName || "Untitled job") : "New job"}
      >
        <label className="portal-field">
          Customer name
          <select
            onChange={(e) => {
              if (e.target.value === "__new__") { setCreatingCustomer(true); return; }
              setCustomerId(e.target.value);
            }}
            required
            value={customerId}
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{customerTitle(c)}</option>)}
            <option value="__new__">+ Create new customer…</option>
          </select>
        </label>

        <label className="portal-field">Job name<input autoFocus onChange={set("jobName")} value={form.jobName} /></label>

        <div className="portal-row">
          <label className="portal-field">Contact name<input onChange={set("contactName")} value={form.contactName} /></label>
          <label className="portal-field">In hand date<input onChange={set("inHandDate")} type="date" value={form.inHandDate} /></label>
        </div>

        <div className="portal-row">
          <label className="portal-field">
            Goods ordered?
            <select onChange={(e) => setGoodsOrdered(e.target.value === "yes")} value={goodsOrdered ? "yes" : "no"}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="portal-field">PO numbers<input onChange={set("poNumbers")} value={form.poNumbers} /></label>
        </div>

        <div className="portal-row">
          <label className="portal-field">
            Decoration type
            <input list="job-decoration-types" onChange={set("decorationType")} value={form.decorationType} />
            <datalist id="job-decoration-types">
              {suggestions.decorationTypes.map((d) => <option key={d} value={d} />)}
            </datalist>
          </label>
          <label className="portal-field">Quantity<input min={0} onChange={set("quantity")} step={1} type="number" value={form.quantity} /></label>
        </div>

        <label className="portal-field">
          Production facility
          <input list="job-production-facilities" onChange={set("productionFacility")} value={form.productionFacility} />
          <datalist id="job-production-facilities">
            {suggestions.productionFacilities.map((f) => <option key={f} value={f} />)}
          </datalist>
        </label>

        {job ? (
          <label className="portal-field">
            Stage
            <select onChange={(e) => setStatus(e.target.value as JobStatus)} value={status}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        ) : null}

        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      </ModalFrame>
      {creatingCustomer ? (
        <CustomerModal
          close={() => setCreatingCustomer(false)}
          customer={null}
          onSaved={handleCustomerCreated}
          salesReps={salesReps}
        />
      ) : null}
    </>
  );
}
