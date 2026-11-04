"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem, ContactMethod, Estimate, Lead, LeadActivity, LeadStatus, Task } from "@/lib/portal/types";
import { CopyField } from "./admin-app";
import { api } from "./api";
import { type StaffOption, TasksSection } from "./tasks-app";

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

const CONTACT_METHODS: { key: ContactMethod; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone Call" },
  { key: "text", label: "Text" },
];

const ACTIVITY_KINDS: { key: LeadActivity["kind"]; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "call", label: "Call" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Meeting" },
];

const ACTIVITY_LABELS: Record<LeadActivity["kind"], string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  status: "Stage change",
  estimate: "Estimate",
};

const ESTIMATE_STATUS_LABEL: Record<Estimate["status"], string> = {
  draft: "Draft",
  sent: "Sent for approval",
  approved: "Approved",
  changes_requested: "Changes requested",
};

function emptyEstimateLine() {
  return { itemName: "", description: "", color: "", size: "", quantity: "1", unitPrice: "", taxable: true };
}

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
  staffUsers,
  initialTasks,
  currentUserName,
  loadError,
}: {
  initialLeads: Lead[];
  staffNames: string[];
  staffUsers: StaffOption[];
  initialTasks: Task[];
  currentUserName: string;
  loadError: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [tasks, setTasks] = useState(initialTasks);
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

  const reloadTasks = async () => {
    const res = await api<{ tasks: Task[] }>("GET", "/api/portal/tasks");
    setTasks(res.tasks);
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
                      {l.jobName ? <p className="portal-card-jobname">{l.jobName}</p> : null}
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

      {adding ? (
        <LeadModal
          close={() => setAdding(false)}
          currentUserName={currentUserName}
          key="new"
          lead={null}
          onSaved={reload}
          reloadTasks={reloadTasks}
          staffNames={staffNames}
          staffUsers={staffUsers}
          tasks={tasks}
        />
      ) : null}
      {selected ? (
        <LeadModal
          close={() => setSelectedId(null)}
          currentUserName={currentUserName}
          key={selected.id}
          lead={selected}
          onSaved={reload}
          reloadTasks={reloadTasks}
          staffNames={staffNames}
          staffUsers={staffUsers}
          tasks={tasks}
        />
      ) : null}
    </div>
  );
}

function LeadModal({
  lead,
  close,
  onSaved,
  staffNames,
  staffUsers,
  tasks,
  currentUserName,
  reloadTasks,
}: {
  lead: Lead | null;
  close: () => void;
  onSaved: () => Promise<void>;
  staffNames: string[];
  staffUsers: StaffOption[];
  tasks: Task[];
  currentUserName: string;
  reloadTasks: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    companyName: lead?.companyName || "",
    contactName: lead?.contactName || "",
    jobName: lead?.jobName || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    source: lead?.source || "",
    estimatedValue: String(lead?.estimatedValue ?? ""),
    owner: lead?.owner || "",
    notes: lead?.notes || "",
  });
  const [status, setStatus] = useState<LeadStatus>(lead?.status || "new");
  const [contactMethod, setContactMethod] = useState<ContactMethod>(lead?.contactMethod || "email");
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
    const body: Record<string, unknown> = { ...form, contactMethod };
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
      <label className="portal-field">Job name<input onChange={set("jobName")} value={form.jobName} /></label>
      <div className="portal-row">
        <label className="portal-field">Email<input onChange={set("email")} type="email" value={form.email} /></label>
        <label className="portal-field">Phone<input onChange={set("phone")} type="tel" value={form.phone} /></label>
      </div>
      <div className="portal-row">
        <label className="portal-field">Source<input onChange={set("source")} placeholder="Referral, website, trade show…" value={form.source} /></label>
        <label className="portal-field">Estimated value ($)<input min={0} onChange={set("estimatedValue")} step={0.01} type="number" value={form.estimatedValue} /></label>
      </div>
      <div className="portal-row">
        <label className="portal-field">
          Owner
          <input list="crm-staff" onChange={set("owner")} placeholder="Who's working this?" value={form.owner} />
          <datalist id="crm-staff">{staffNames.map((n) => <option key={n} value={n} />)}</datalist>
        </label>
        <label className="portal-field">
          Contact method
          <select onChange={(e) => setContactMethod(e.target.value as ContactMethod)} value={contactMethod}>
            {CONTACT_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
      </div>
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
      {lead ? <EstimateSection lead={lead} onStatusChanged={setStatus} /> : null}
      {lead ? (
        <TasksSection
          currentUserName={currentUserName}
          leadId={lead.id}
          onChanged={reloadTasks}
          staffUsers={staffUsers}
          tasks={tasks.filter((t) => t.leadId === lead.id)}
        />
      ) : null}
      {lead ? <ActivityFeed lead={lead} onAdded={onSaved} /> : null}
    </ModalFrame>
  );
}

/** An estimate line's item name field: typing searches the item catalog, and picking a match fills it in. */
export function ItemNameField({
  value,
  onChange,
  onPick,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  onPick: (item: CatalogItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<CatalogItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setMatches([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api<{ items: CatalogItem[] }>("GET", `/api/portal/catalog-items?q=${encodeURIComponent(value.trim())}&limit=8`)
        .then((res) => setMatches(res.items))
        .catch(() => setMatches([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="portal-combobox" ref={boxRef}>
      <input
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        value={value}
      />
      {open && matches.length ? (
        <div className="portal-combobox__menu" role="listbox">
          {matches.map((m) => (
            <button
              className="portal-combobox__option"
              key={m.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(m);
                setOpen(false);
              }}
              type="button"
            >
              <strong>{m.itemNumber}</strong>{m.displayName ? ` — ${m.displayName}` : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Builds and sends a lead's estimate for the customer to approve from
 * their portal, and shows where it stands once sent. No email goes out in
 * v1 -- staff hand over the one-time login themselves, the same way the
 * Credentials panel already works.
 */
function EstimateSection({ lead, onStatusChanged }: { lead: Lead; onStatusChanged: (status: LeadStatus) => void }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lines, setLines] = useState([emptyEstimateLine()]);
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [origin, setOrigin] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = async () => {
    const res = await api<{ estimate: Estimate | null }>("GET", `/api/portal/crm/leads/${lead.id}/estimate`);
    setEstimate(res.estimate);
    if (res.estimate) {
      setLines(
        res.estimate.lineItems.length
          ? res.estimate.lineItems.map((li) => ({
              itemName: li.itemName,
              description: li.description,
              color: li.color,
              size: li.size,
              quantity: String(li.quantity),
              unitPrice: String(li.unitPrice),
              taxable: li.taxable,
            }))
          : [emptyEstimateLine()],
      );
      setTaxRate(String(res.estimate.taxRate));
      setNotes(res.estimate.notes);
    }
    setLoaded(true);
  };

  useEffect(() => {
    void load();
    // Only on mount: later refreshes are triggered by this section's own actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const locked = estimate?.status === "approved";
  const lineAmount = (l: (typeof lines)[number]) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const taxableSubtotal = lines.filter((l) => l.taxable).reduce((sum, l) => sum + lineAmount(l), 0);
  const taxAmount = taxableSubtotal * ((Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  function draftBody() {
    return {
      lineItems: lines
        .filter((l) => l.itemName.trim())
        .map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      taxRate: Number(taxRate) || 0,
      notes,
    };
  }

  function saveDraft() {
    void run(async () => {
      await api("PUT", `/api/portal/crm/leads/${lead.id}/estimate`, draftBody());
      await load();
    });
  }

  function send() {
    void run(async () => {
      await api("PUT", `/api/portal/crm/leads/${lead.id}/estimate`, draftBody());
      const res = await api<{ clientId: number; credentials: { email: string; password: string } | null }>(
        "POST",
        `/api/portal/crm/leads/${lead.id}/estimate/send`,
      );
      if (res.credentials) setCredentials(res.credentials);
      onStatusChanged("proposal");
      await load();
    });
  }

  if (!loaded) return null;

  return (
    <section className="portal-panel">
      <div className="portal-panel-head">
        <h2>Estimate</h2>
        {estimate ? (
          <span className={`portal-pill${estimate.status === "approved" ? " ok" : estimate.status === "changes_requested" ? " low" : ""}`}>
            {ESTIMATE_STATUS_LABEL[estimate.status]}
          </span>
        ) : null}
      </div>
      <div className="portal-panel-body">
        {estimate?.status === "changes_requested" ? (
          <p className="portal-msg warn">The customer requested changes -- see Conversation history below. Update the line items and send again.</p>
        ) : null}

        {credentials ? (
          <div className="portal-secret" role="status">
            <p>
              Send these to <strong>{credentials.email}</strong> so they can review and approve the estimate. The temporary
              password is shown only once.
            </p>
            <div className="portal-row">
              <CopyField label="Sign-in page" value={`${origin}/portal/login`} />
              <CopyField label="Temporary password" value={credentials.password} />
            </div>
            <button className="portal-btn small" onClick={() => setCredentials(null)} type="button">Done</button>
          </div>
        ) : null}

        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

        {lines.map((l, i) => (
          <div className="portal-row" key={i}>
            <label className="portal-field">
              Item name
              <ItemNameField
                disabled={locked}
                onChange={(itemName) => setLines(lines.map((x, j) => (j === i ? { ...x, itemName } : x)))}
                onPick={(item) =>
                  setLines(
                    lines.map((x, j) => (j === i ? { ...x, itemName: item.displayName || item.itemNumber } : x)),
                  )
                }
                value={l.itemName}
              />
            </label>
            <label className="portal-field">
              Description
              <textarea
                disabled={locked}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                rows={2}
                value={l.description}
              />
            </label>
            <label className="portal-field">
              Color
              <input
                disabled={locked}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
                value={l.color}
              />
            </label>
            <label className="portal-field">
              Size
              <input
                disabled={locked}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))}
                value={l.size}
              />
            </label>
            <label className="portal-field">
              Qty
              <input
                disabled={locked}
                min={1}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                type="number"
                value={l.quantity}
              />
            </label>
            <label className="portal-field">
              Unit price ($)
              <input
                disabled={locked}
                min={0}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))}
                step={0.01}
                type="number"
                value={l.unitPrice}
              />
            </label>
            <label className="portal-check">
              <input
                checked={l.taxable}
                disabled={locked}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, taxable: e.target.checked } : x)))}
                type="checkbox"
              />
              Taxable
            </label>
            {!locked && lines.length > 1 ? (
              <button aria-label="Remove line" className="portal-btn small danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} type="button">
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {!locked ? (
          <button className="portal-btn small" onClick={() => setLines([...lines, emptyEstimateLine()])} type="button">Add line item</button>
        ) : null}

        <div className="portal-row">
          <label className="portal-field">
            Tax rate (%)
            <input disabled={locked} min={0} max={100} onChange={(e) => setTaxRate(e.target.value)} step={0.01} type="number" value={taxRate} />
          </label>
          <div className="portal-copy"><span className="portal-eyebrow">Subtotal</span><span>{currency.format(subtotal)}</span></div>
          <div className="portal-copy"><span className="portal-eyebrow">Tax</span><span>{currency.format(taxAmount)}</span></div>
          <div className="portal-copy"><span className="portal-eyebrow">Total</span><span>{currency.format(total)}</span></div>
        </div>
        <label className="portal-field">Notes for the customer<textarea disabled={locked} onChange={(e) => setNotes(e.target.value)} rows={2} value={notes} /></label>

        <div className="portal-row-actions">
          {estimate ? (
            <a className="portal-btn" href={`/api/portal/crm/leads/${lead.id}/estimate/pdf`} rel="noreferrer" target="_blank">
              Export PDF
            </a>
          ) : null}
          {!locked ? (
            <>
              <button className="portal-btn" disabled={busy} onClick={saveDraft} type="button">Save draft</button>
              <button className="portal-btn primary" disabled={busy} onClick={send} type="button">
                {estimate && estimate.status !== "draft" ? "Send updated estimate" : "Send for approval"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
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
                <span>{ACTIVITY_LABELS[a.kind]} · {a.createdBy}</span>
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
