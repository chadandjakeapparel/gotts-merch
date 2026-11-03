"use client";

import { useEffect, useState } from "react";
import type { JobPosting, JobPostingStatus } from "@/lib/portal/types";
import { api } from "./api";

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

function ModalFrame({ title, children, footer, close }: { title: string; children: React.ReactNode; footer: React.ReactNode; close: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="portal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div aria-modal="true" className="portal-modal portal-modal-wide" role="dialog">
        <div className="portal-modal-head"><h2>{title}</h2></div>
        <div className="portal-modal-body">{children}</div>
        <div className="portal-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<JobPostingStatus, string> = { live: "Live", not_live: "Not Live" };

export function JobPostingsApp({
  initialJobPostings,
  loadError,
}: {
  initialJobPostings: JobPosting[];
  loadError: string;
}) {
  const [jobPostings, setJobPostings] = useState(initialJobPostings);
  const [error, setError] = useState(loadError);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const reload = async () => {
    try {
      const res = await api<{ jobPostings: JobPosting[] }>("GET", "/api/portal/job-postings");
      setJobPostings(res.jobPostings);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job postings couldn't be loaded.");
    }
  };

  const selected = selectedId ? jobPostings.find((j) => j.id === selectedId) || null : null;

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Job Postings</h1>
        </div>
        <span className="portal-row-actions">
          <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New job posting</button>
        </span>
      </div>
      <p className="portal-hint">
        Postings marked <strong>Live</strong> show up on the public Jobs page; <strong>Not Live</strong> ones stay hidden
        until you&apos;re ready.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {jobPostings.length ? (
              jobPostings.map((j) => (
                <tr key={j.id}>
                  <td>
                    <button className="portal-link" onClick={() => setSelectedId(j.id)} type="button">
                      {j.title || "Untitled posting"}
                    </button>
                  </td>
                  <td>{j.location}</td>
                  <td>
                    <span className={`portal-badge${j.status === "live" ? " ok" : ""}`}>{STATUS_LABEL[j.status]}</span>
                  </td>
                  <td>{fmtDate(j.updatedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="portal-col-empty" colSpan={4}>No job postings yet -- add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? <JobPostingModal close={() => setAdding(false)} jobPosting={null} onSaved={reload} /> : null}
      {selected ? (
        <JobPostingModal close={() => setSelectedId(null)} jobPosting={selected} key={selected.id} onSaved={reload} />
      ) : null}
    </div>
  );
}

function JobPostingModal({
  jobPosting,
  close,
  onSaved,
}: {
  jobPosting: JobPosting | null;
  close: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: jobPosting?.title || "",
    location: jobPosting?.location || "",
    employmentType: jobPosting?.employmentType || "",
    summary: jobPosting?.summary || "",
    description: jobPosting?.description || "",
    requirements: jobPosting?.requirements || "",
    compensation: jobPosting?.compensation || "",
    benefits: jobPosting?.benefits || "",
    applyUrl: jobPosting?.applyUrl || "",
    status: jobPosting?.status || ("not_live" as JobPostingStatus),
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const setField =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError("Give the job a title.");
    void submit(() =>
      jobPosting
        ? api("PATCH", `/api/portal/job-postings/${jobPosting.id}`, form)
        : api("POST", "/api/portal/job-postings", form),
    );
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {jobPosting ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this posting?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/job-postings/${jobPosting.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{jobPosting ? "Save" : "Add posting"}</button>
        </>
      }
      title={jobPosting ? jobPosting.title || "Untitled posting" : "New job posting"}
    >
      <div className="portal-row">
        <label className="portal-field">Title<input autoFocus onChange={setField("title")} value={form.title} /></label>
        <label className="portal-field">
          Status
          <select onChange={setField("status")} value={form.status}>
            <option value="not_live">Not Live</option>
            <option value="live">Live</option>
          </select>
        </label>
      </div>
      <div className="portal-row">
        <label className="portal-field">Location<input onChange={setField("location")} placeholder="e.g. Remote, or city, state" value={form.location} /></label>
        <label className="portal-field">Job type<input onChange={setField("employmentType")} placeholder="e.g. Full-time" value={form.employmentType} /></label>
      </div>
      <label className="portal-field">
        Summary
        <textarea onChange={setField("summary")} placeholder="A short teaser shown on the job board card." rows={2} value={form.summary} />
      </label>
      <label className="portal-field">
        Description
        <textarea onChange={setField("description")} rows={10} value={form.description} />
      </label>
      <label className="portal-field">
        Requirements
        <textarea onChange={setField("requirements")} rows={8} value={form.requirements} />
      </label>
      <div className="portal-row">
        <label className="portal-field">Compensation<textarea onChange={setField("compensation")} rows={2} value={form.compensation} /></label>
        <label className="portal-field">Apply link<input onChange={setField("applyUrl")} placeholder="https://…" value={form.applyUrl} /></label>
      </div>
      <label className="portal-field">
        Benefits
        <textarea onChange={setField("benefits")} rows={4} value={form.benefits} />
      </label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}
