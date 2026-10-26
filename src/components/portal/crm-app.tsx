"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadActivity, LeadStatus } from "@/lib/portal/types";
import { api } from "./api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const count = new Intl.NumberFormat("en-US");

const STAGES: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const ACTIVITY_KINDS: { key: LeadActivity["kind"]; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "call", label: "Call" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Meeting" },
];

function fmtDate(value: string, withTime = false) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  });
}

const leadTitle = (l: Pick<Lead, "companyName" | "contactName">) => l.companyName || l.contactName || "Untitled lead";

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

export function CrmApp({
  initialLeads,
  staffNames,
  loadError,
}: {
  initialLeads: Lead[];
  staffNames: string[];
  loadError: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState(loadError);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);

  const reload = async () => {
    try {
      const res = await api<{ leads: Lead[] }>("GET", "/api/portal/crm/leads");
      setLeads(res.leads);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The board couldn't be refreshed.");
    }
  };

  /** Moves a lead to a stage by drag and drop, then reloads so a move into Won picks up the new client link. */
  async function moveLead(leadId: number, status: LeadStatus) {
    const previous = leads;
    const lead = previous.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      await api("PATCH", `/api/portal/crm/leads/${leadId}/status`, { status });
      await reload();
    } catch (err) {
      setLeads(previous);
      setError(err instanceof Error ? err.message : "Couldn't move that lead. Try again.");
    }
  }

  const byStage = useMemo(() => {
    const m = new Map<LeadStatus, Lead[]>(STAGES.map((s) => [s.key, [] as Lead[]]));
    for (const l of leads) m.get(l.status)?.push(l);
    return m;
  }, [leads]);

  const totals = useMemo(() => {
    const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
    return {
      open: open.length,
      pipelineValue: open.reduce((s, l) => s + l.estimatedValue, 0),
      won: leads.filter((l) => l.status === "won").length,
      lost: leads.filter((l) => l.status === "lost").length,
    };
  }, [leads]);

  const selected = selectedId ? leads.find((l) => l.id === selectedId) || null : null;

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Internal</span>
          <h1>CRM</h1>
        </div>
        <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New lead</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section aria-label="Totals" className="portal-summary">
        <div><span className="portal-eyebrow">Open leads</span><strong>{count.format(totals.open)}</strong></div>
        <div><span className="portal-eyebrow">Pipeline value</span><strong>{currency.format(totals.pipelineValue)}</strong></div>
        <div><span className="portal-eyebrow">Won</span><strong>{count.format(totals.won)}</strong></div>
        <div><span className="portal-eyebrow">Lost</span><strong>{count.format(totals.lost)}</strong></div>
      </section>

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
                  if (id) void moveLead(id, s.key);
                }}
              >
                {items.length ? (
                  items.map((l) => (
                    <button
                      className={`portal-card${draggingId === l.id ? " dragging" : ""}`}
                      draggable
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onDragStart={(e) => {
                        setDraggingId(l.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(l.id));
                      }}
                      type="button"
                    >
                      <h4>{leadTitle(l)}</h4>
                      {l.companyName && l.contactName ? <span className="portal-muted small">{l.contactName}</span> : null}
                      <div className="portal-card-foot">
                        <span className="portal-muted">{l.owner || "Unassigned"}</span>
                        {l.estimatedValue ? <span>{currency.format(l.estimatedValue)}</span> : null}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="portal-col-empty">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {adding ? <LeadModal close={() => setAdding(false)} key="new" lead={null} onSaved={reload} staffNames={staffNames} /> : null}
      {selected ? (
        <LeadModal close={() => setSelectedId(null)} key={selected.id} lead={selected} onSaved={reload} staffNames={staffNames} />
      ) : null}
    </div>
  );
}

function LeadModal({
  lead,
  close,
  onSaved,
  staffNames,
}: {
  lead: Lead | null;
  close: () => void;
  onSaved: () => Promise<void>;
  staffNames: string[];
}) {
  const [form, setForm] = useState({
    companyName: lead?.companyName || "",
    contactName: lead?.contactName || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    source: lead?.source || "",
    estimatedValue: String(lead?.estimatedValue ?? ""),
    owner: lead?.owner || "",
    notes: lead?.notes || "",
  });
  const [status, setStatus] = useState<LeadStatus>(lead?.status || "new");
  const [lostReason, setLostReason] = useState(lead?.lostReason || "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim() && !form.contactName.trim()) return setError("Give the lead a company name or a contact name.");
    const body: Record<string, unknown> = { ...form };
    if (lead) {
      body.status = status;
      if (status === "lost") body.lostReason = lostReason;
    }
    void submit(() =>
      lead ? api("PATCH", `/api/portal/crm/leads/${lead.id}`, body) : api("POST", "/api/portal/crm/leads", body),
    );
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {lead ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this lead?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/crm/leads/${lead.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{lead ? "Save" : "Add lead"}</button>
        </>
      }
      title={lead ? leadTitle(lead) : "New lead"}
    >
      <div className="portal-row">
        <label className="portal-field">Company<input autoFocus onChange={set("companyName")} value={form.companyName} /></label>
        <label className="portal-field">Contact name<input onChange={set("contactName")} value={form.contactName} /></label>
      </div>
      <div className="portal-row">
        <label className="portal-field">Email<input onChange={set("email")} type="email" value={form.email} /></label>
        <label className="portal-field">Phone<input onChange={set("phone")} type="tel" value={form.phone} /></label>
      </div>
      <div className="portal-row">
        <label className="portal-field">Source<input onChange={set("source")} placeholder="Referral, website, trade show…" value={form.source} /></label>
        <label className="portal-field">Estimated value ($)<input min={0} onChange={set("estimatedValue")} step={0.01} type="number" value={form.estimatedValue} /></label>
      </div>
      <label className="portal-field">
        Owner
        <input list="crm-staff" onChange={set("owner")} placeholder="Who's working this?" value={form.owner} />
        <datalist id="crm-staff">{staffNames.map((n) => <option key={n} value={n} />)}</datalist>
      </label>
      {lead ? (
        <div className="portal-row">
          <label className="portal-field">
            Stage
            <select onChange={(e) => setStatus(e.target.value as LeadStatus)} value={status}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          {status === "lost" ? (
            <label className="portal-field">Why lost<input onChange={(e) => setLostReason(e.target.value)} value={lostReason} /></label>
          ) : null}
        </div>
      ) : null}
      {lead?.clientId ? (
        <p className="portal-hint">
          Won — <Link className="portal-link" href={`/portal?client=${lead.clientId}`}>open their inventory</Link> to start tracking orders.
        </p>
      ) : null}
      <label className="portal-field">Notes<textarea onChange={set("notes")} rows={3} value={form.notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      {lead ? <ActivityFeed lead={lead} onAdded={onSaved} /> : null}
    </ModalFrame>
  );
}

function ActivityFeed({ lead, onAdded }: { lead: Lead; onAdded: () => Promise<void> }) {
  const [kind, setKind] = useState<LeadActivity["kind"]>("note");
  const [body, setBody] = useState("");
  const { busy, error, submit } = useSubmit(async () => {
    await onAdded();
    setBody("");
  });

  return (
    <div className="portal-activity-section">
      <span className="portal-eyebrow">Conversation history</span>
      <div className="portal-activity-list">
        {lead.activities.length ? (
          lead.activities.map((a) => (
            <div className="portal-activity" key={a.id}>
              <div className="portal-activity-head">
                <span>{a.kind === "status" ? "Stage change" : ACTIVITY_KINDS.find((k) => k.key === a.kind)?.label || "Note"} · {a.createdBy}</span>
                <span>{fmtDate(a.createdAt, true)}</span>
              </div>
              <p>{a.body}</p>
            </div>
          ))
        ) : (
          <p className="portal-muted small">Nothing logged yet.</p>
        )}
      </div>
      <form
        className="portal-activity-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          void submit(() => api("POST", `/api/portal/crm/leads/${lead.id}/activities`, { kind, body }));
        }}
      >
        <select aria-label="Activity type" onChange={(e) => setKind(e.target.value as LeadActivity["kind"])} value={kind}>
          {ACTIVITY_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <input aria-label="Add to the conversation history" onChange={(e) => setBody(e.target.value)} placeholder="What happened?" value={body} />
        <button className="portal-btn small primary" disabled={busy || !body.trim()} type="submit">Log it</button>
      </form>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </div>
  );
}
