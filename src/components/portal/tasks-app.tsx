"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/portal/types";
import { api } from "./api";

export type StaffOption = { id: number; name: string; email: string };

function fmtTaskDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
      <div aria-modal="true" className="portal-modal" role="dialog">
        <div className="portal-modal-head"><h2>{title}</h2></div>
        <div className="portal-modal-body">{children}</div>
        <div className="portal-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onOpen }: { task: Task; onToggle: () => void; onOpen: () => void }) {
  const bits = [
    task.completeBy ? `Due ${fmtTaskDate(task.completeBy)}` : "No date",
    `Assigned to ${task.assignedToName || "no one"}`,
    task.assignedByName ? `by ${task.assignedByName}` : "",
    task.leadTitle ? `Lead: ${task.leadTitle}` : "",
    task.jobTitle ? `Job: ${task.jobTitle}` : "",
  ].filter(Boolean);
  return (
    <li className="portal-task">
      <input checked={task.completed} onChange={onToggle} type="checkbox" />
      <button className="portal-task-main" onClick={onOpen} type="button">
        <span className={`portal-task-name${task.completed ? " done" : ""}`}>{task.name}</span>
        <span className="portal-task-meta">{bits.join(" · ")}</span>
        {task.notes ? <span className="portal-task-notes">{task.notes}</span> : null}
      </button>
    </li>
  );
}

function TaskModal({
  task,
  close,
  onSaved,
  staffUsers,
  currentUserName,
  leadId,
  jobId,
}: {
  task: Task | null;
  close: () => void;
  onSaved: () => Promise<void>;
  staffUsers: StaffOption[];
  currentUserName: string;
  leadId: number | null;
  jobId: number | null;
}) {
  const [form, setForm] = useState({
    name: task?.name || "",
    notes: task?.notes || "",
    completeBy: task?.completeBy || "",
  });
  const [assignedToUserId, setAssignedToUserId] = useState(task?.assignedToUserId != null ? String(task.assignedToUserId) : "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Give the task a name.");
    const body: Record<string, unknown> = {
      ...form,
      assignedToUserId: assignedToUserId || null,
      leadId,
      jobId,
    };
    void submit(() => (task ? api("PATCH", `/api/portal/tasks/${task.id}`, body) : api("POST", "/api/portal/tasks", body)));
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          {task ? (
            confirmingDelete ? (
              <span className="portal-row-actions push-left">
                <span className="portal-muted small">Delete this task?</span>
                <button
                  className="portal-btn small danger"
                  disabled={busy}
                  onClick={() => void submit(() => api("DELETE", `/api/portal/tasks/${task.id}`))}
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
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">{task ? "Save" : "Add task"}</button>
        </>
      }
      title={task ? task.name || "Untitled task" : "New task"}
    >
      <label className="portal-field">Name<input autoFocus onChange={set("name")} value={form.name} /></label>
      <div className="portal-row">
        <label className="portal-field">
          Assigned to
          <select onChange={(e) => setAssignedToUserId(e.target.value)} value={assignedToUserId}>
            <option value="">Unassigned</option>
            {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </label>
        <label className="portal-field">Complete by<input onChange={set("completeBy")} type="date" value={form.completeBy} /></label>
      </div>
      <p className="portal-hint">Assigned by {task ? task.assignedByName || "—" : `${currentUserName} (you)`}</p>
      <label className="portal-field">Notes<textarea onChange={set("notes")} rows={4} value={form.notes} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

/** Embeddable in a CRM lead or Job Board job modal: just that record's tasks. */
export function TasksSection({
  tasks,
  staffUsers,
  currentUserName,
  leadId = null,
  jobId = null,
  onChanged,
}: {
  tasks: Task[];
  staffUsers: StaffOption[];
  currentUserName: string;
  leadId?: number | null;
  jobId?: number | null;
  onChanged: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [error, setError] = useState("");

  async function toggleCompleted(t: Task) {
    setError("");
    try {
      await api("PATCH", `/api/portal/tasks/${t.id}`, { completed: !t.completed });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that task.");
    }
  }

  return (
    <div className="portal-tasks-section">
      <div className="portal-tasks-section__head">
        <span className="portal-eyebrow">Tasks</span>
        <button className="portal-link small" onClick={() => setAdding(true)} type="button">+ Add task</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      {tasks.length ? (
        <ul className="portal-tasks">
          {tasks.map((t) => (
            <TaskRow key={t.id} onOpen={() => setEditing(t)} onToggle={() => void toggleCompleted(t)} task={t} />
          ))}
        </ul>
      ) : (
        <p className="portal-muted small">No tasks yet.</p>
      )}
      {adding ? (
        <TaskModal
          close={() => setAdding(false)}
          currentUserName={currentUserName}
          jobId={jobId}
          leadId={leadId}
          onSaved={onChanged}
          staffUsers={staffUsers}
          task={null}
        />
      ) : null}
      {editing ? (
        <TaskModal
          close={() => setEditing(null)}
          currentUserName={currentUserName}
          jobId={editing.jobId}
          leadId={editing.leadId}
          onSaved={onChanged}
          staffUsers={staffUsers}
          task={editing}
        />
      ) : null}
    </div>
  );
}

export function TasksApp({
  initialTasks,
  staffUsers,
  currentUserName,
  loadError,
}: {
  initialTasks: Task[];
  staffUsers: StaffOption[];
  currentUserName: string;
  loadError: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState(loadError);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCompleted, setShowCompleted] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const reload = async () => {
    try {
      const res = await api<{ tasks: Task[] }>("GET", "/api/portal/tasks");
      setTasks(res.tasks);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The tasks list couldn't be refreshed.");
    }
  };

  async function toggleCompleted(task: Task) {
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    try {
      await api("PATCH", `/api/portal/tasks/${task.id}`, { completed: !task.completed });
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Couldn't update that task.");
    }
  }

  const assigneeOptions = useMemo(
    () => staffUsers.slice().sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)),
    [staffUsers],
  );

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (!showCompleted) list = list.filter((t) => !t.completed);
    if (assigneeFilter) list = list.filter((t) => String(t.assignedToUserId) === assigneeFilter);
    return list.slice().sort((a, b) => {
      const ad = a.completeBy || (sortDir === "asc" ? "9999-99-99" : "");
      const bd = b.completeBy || (sortDir === "asc" ? "9999-99-99" : "");
      return sortDir === "asc" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
  }, [tasks, showCompleted, assigneeFilter, sortDir]);

  const totals = useMemo(() => {
    const today = todayStr();
    return {
      open: tasks.filter((t) => !t.completed).length,
      overdue: tasks.filter((t) => !t.completed && t.completeBy && t.completeBy < today).length,
    };
  }, [tasks]);

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Tasks</h1>
        </div>
        <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New task</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section aria-label="Totals" className="portal-summary">
        <div><span className="portal-eyebrow">Open tasks</span><strong>{totals.open}</strong></div>
        <div><span className="portal-eyebrow">Overdue</span><strong className={totals.overdue ? "warn" : undefined}>{totals.overdue}</strong></div>
      </section>

      <div className="portal-toolbar">
        <select aria-label="Filter by assigned to" onChange={(e) => setAssigneeFilter(e.target.value)} value={assigneeFilter}>
          <option value="">Everyone</option>
          {assigneeOptions.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <select aria-label="Sort by complete-by date" onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} value={sortDir}>
          <option value="asc">Complete by: soonest first</option>
          <option value="desc">Complete by: latest first</option>
        </select>
        <label className="portal-check">
          <input checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} type="checkbox" />
          Show completed
        </label>
      </div>

      <section className="portal-panel">
        {visibleTasks.length ? (
          <ul className="portal-tasks portal-tasks--page">
            {visibleTasks.map((t) => (
              <TaskRow key={t.id} onOpen={() => setEditing(t)} onToggle={() => void toggleCompleted(t)} task={t} />
            ))}
          </ul>
        ) : (
          <div className="portal-empty">
            <p>{tasks.length ? "No tasks match this filter." : "No tasks yet."}</p>
          </div>
        )}
      </section>

      {adding ? (
        <TaskModal close={() => setAdding(false)} currentUserName={currentUserName} jobId={null} leadId={null} onSaved={reload} staffUsers={staffUsers} task={null} />
      ) : null}
      {editing ? (
        <TaskModal close={() => setEditing(null)} currentUserName={currentUserName} jobId={editing.jobId} leadId={editing.leadId} onSaved={reload} staffUsers={staffUsers} task={editing} />
      ) : null}
    </div>
  );
}
