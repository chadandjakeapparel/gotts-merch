"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Customer, Job, PortalUser, SalesRep, Task } from "@/lib/portal/types";
import { api } from "./api";
import { CopyField } from "./admin-app";
import { addressSummary, CustomerModal, customerTitle } from "./customers-app";
import { JobModal } from "./jobs-app";
import { type StaffOption } from "./tasks-app";

const count = new Intl.NumberFormat("en-US");

const JOB_STATUS_LABEL: Record<Job["status"], string> = {
  pending: "Pending",
  in_production: "In Production",
  ready: "Ready to Ship/Pickup",
  delivered: "Delivered",
};

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Parses a "YYYY-MM-DD" date as a local date, so it never shifts a day off in formatting. */
function fmtInHandDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="portal-copy">
      <span className="portal-eyebrow">{label}</span>
      <span>{value || <span className="portal-muted">Not set</span>}</span>
    </div>
  );
}

/** The customer's own portal logins -- lets them sign in to see their inventory and orders. */
function CredentialsSection({ customerId }: { customerId: number }) {
  const [loaded, setLoaded] = useState(false);
  const [logins, setLogins] = useState<PortalUser[]>([]);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [newLogin, setNewLogin] = useState({ email: "", name: "" });
  const [editingUser, setEditingUser] = useState<{ id: number; name: string } | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const reload = async () => {
    const res = await api<{ clientId: number | null; logins: PortalUser[] }>(
      "GET",
      `/api/portal/customers/${customerId}/credentials`,
    );
    setLogins(res.logins);
    setLoaded(true);
  };

  useEffect(() => {
    void reload();
    // Only on mount: later refreshes are triggered by this section's own actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-panel">
      <div className="portal-panel-head"><h2>Credentials</h2></div>

      {secret ? (
        <div className="portal-secret" role="status">
          <p>
            Send these to <strong>{secret.email}</strong>. The temporary password is shown only once, and they&apos;ll be
            asked to choose their own when they first sign in.
          </p>
          <div className="portal-row">
            <CopyField label="Sign-in page" value={`${origin}/portal/login`} />
            <CopyField label="Temporary password" value={secret.password} />
          </div>
          <button className="portal-btn small" onClick={() => setSecret(null)} type="button">Done</button>
        </div>
      ) : null}

      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <form
        className="portal-login-add"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const res = await api<{ email: string; password: string }>(
              "POST",
              `/api/portal/customers/${customerId}/credentials`,
              newLogin,
            );
            setSecret(res);
            setNewLogin({ email: "", name: "" });
          });
        }}
      >
        <label className="portal-field">
          Email
          <input onChange={(e) => setNewLogin({ ...newLogin, email: e.target.value })} required type="email" value={newLogin.email} />
        </label>
        <label className="portal-field">
          Name
          <input onChange={(e) => setNewLogin({ ...newLogin, name: e.target.value })} value={newLogin.name} />
        </label>
        <button className="portal-btn primary" disabled={busy} type="submit">Create login</button>
      </form>

      {logins.length ? (
        <div className="portal-table-wrap">
          <table className="portal-table compact">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Last sign-in</th><th className="r"><span className="portal-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {logins.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.mustChangePassword ? <span className="portal-pill low">Temporary password</span> : null}</td>
                  <td>
                    {editingUser?.id === u.id ? (
                      <span className="portal-inline">
                        <input autoFocus onChange={(e) => setEditingUser({ id: u.id, name: e.target.value })} value={editingUser.name} />
                        <button
                          className="portal-btn small primary"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api("PATCH", `/api/portal/customers/${customerId}/credentials/${u.id}`, {
                                action: "rename",
                                name: editingUser.name,
                              });
                              setEditingUser(null);
                            })
                          }
                          type="button"
                        >
                          Save
                        </button>
                        <button className="portal-btn small" onClick={() => setEditingUser(null)} type="button">Cancel</button>
                      </span>
                    ) : (
                      <span className="portal-row-actions">
                        {u.name}
                        <button className="portal-link small" onClick={() => setEditingUser({ id: u.id, name: u.name })} type="button">Rename</button>
                      </span>
                    )}
                  </td>
                  <td>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Never"}</td>
                  <td className="r">
                    {confirming === u.id ? (
                      <span className="portal-row-actions">
                        <button
                          className="portal-btn small danger"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api("DELETE", `/api/portal/customers/${customerId}/credentials/${u.id}`);
                              setConfirming(null);
                            })
                          }
                          type="button"
                        >
                          Remove
                        </button>
                        <button className="portal-btn small" onClick={() => setConfirming(null)} type="button">Keep</button>
                      </span>
                    ) : (
                      <span className="portal-row-actions">
                        <button
                          className="portal-btn small"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const res = await api<{ email: string; password: string }>(
                                "PATCH",
                                `/api/portal/customers/${customerId}/credentials/${u.id}`,
                                { action: "reset" },
                              );
                              setSecret(res);
                            })
                          }
                          type="button"
                        >
                          Reset password
                        </button>
                        <button className="portal-btn small danger" onClick={() => setConfirming(u.id)} type="button">Remove</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : loaded ? (
        <p className="portal-muted small portal-login-add-hint">No portal logins yet for this customer.</p>
      ) : null}
    </section>
  );
}

export function CustomerDetailApp({
  customer,
  initialJobs,
  initialCustomers,
  initialTasks,
  salesReps,
  staffUsers,
  currentUserName,
  loadError,
}: {
  customer: Customer;
  initialJobs: Job[];
  initialCustomers: Customer[];
  initialTasks: Task[];
  salesReps: SalesRep[];
  staffUsers: StaffOption[];
  currentUserName: string;
  loadError: string;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [customers, setCustomers] = useState(initialCustomers);
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState(loadError);
  const [editing, setEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const reloadJobs = async () => {
    try {
      const res = await api<{ jobs: Job[] }>("GET", "/api/portal/jobs");
      setJobs(res.jobs.filter((j) => j.customerId === customer.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This customer's jobs couldn't be refreshed.");
    }
  };

  const reloadTasks = async () => {
    const res = await api<{ tasks: Task[] }>("GET", "/api/portal/tasks");
    setTasks(res.tasks);
  };

  const reloadCustomers = async () => {
    const res = await api<{ customers: Customer[] }>("GET", "/api/portal/customers");
    setCustomers(res.customers);
    return res.customers;
  };

  const suggestions = useMemo(
    () => ({
      decorationTypes: [...new Set(jobs.map((j) => j.decorationType).filter(Boolean))],
      productionFacilities: [...new Set(jobs.map((j) => j.productionFacility).filter(Boolean))],
    }),
    [jobs],
  );

  const repName = salesReps.find((r) => r.id === customer.salesRepId)?.name || "Unassigned";
  const otherAddresses = customer.shippingAddresses.filter((a) => !a.isPrimary);
  const activeJobs = jobs.filter((j) => j.status !== "delivered").length;
  const editingJob = editingJobId ? jobs.find((j) => j.id === editingJobId) || null : null;

  const filteredJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (statusFilter && j.status !== statusFilter) return false;
        const createdDate = j.createdAt.slice(0, 10);
        if (createdFrom && createdDate < createdFrom) return false;
        if (createdTo && createdDate > createdTo) return false;
        return true;
      }),
    [jobs, statusFilter, createdFrom, createdTo],
  );

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await api("DELETE", `/api/portal/customers/${customer.id}`);
      router.push("/portal/customers");
    } catch (err) {
      setDeleting(false);
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete this customer.");
    }
  }

  return (
    <div className="portal-crm">
      <Link className="portal-link" href="/portal/customers">← All customers</Link>

      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">{customer.kind === "company" ? "Company" : "Individual"}</span>
          <h1>{customerTitle(customer)}</h1>
        </div>
        <span className="portal-row-actions">
          {confirmingDelete ? (
            <>
              <span className="portal-muted small">Delete this customer?</span>
              <button className="portal-btn small danger" disabled={deleting} onClick={() => void handleDelete()} type="button">
                Delete
              </button>
              <button className="portal-btn small" onClick={() => setConfirmingDelete(false)} type="button">Cancel</button>
            </>
          ) : (
            <button className="portal-btn danger" onClick={() => setConfirmingDelete(true)} type="button">Delete</button>
          )}
          <button className="portal-btn primary" onClick={() => setEditing(true)} type="button">Edit</button>
        </span>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
      {deleteError ? <p className="portal-msg err" role="alert">{deleteError}</p> : null}

      <section aria-label="Summary" className="portal-summary">
        <div><span className="portal-eyebrow">Total jobs</span><strong>{count.format(jobs.length)}</strong></div>
        <div><span className="portal-eyebrow">Active jobs</span><strong>{count.format(activeJobs)}</strong></div>
        <div><span className="portal-eyebrow">Sales rep</span><strong>{repName}</strong></div>
        <div><span className="portal-eyebrow">Subscribed</span><strong>{customer.subscribed ? "Yes" : "No"}</strong></div>
      </section>

      <div className="portal-detail-grid">
        <section className="portal-panel portal-panel-compact">
          <div className="portal-panel-head"><h2>Contact</h2></div>
          <div className="portal-panel-body">
            {customer.kind === "company" ? <Field label="Point of contact" value={customer.pointOfContact} /> : null}
            <Field label="Phone" value={customer.phone} />
            <Field label="Email" value={customer.emails.length ? customer.emails.join(", ") : ""} />
            <Field label="Inventory held" value={customer.inventoryHeld ? "Yes" : "No"} />
            <Field label="Notes" value={customer.notes} />
          </div>
        </section>

        <section className="portal-panel portal-panel-compact">
          <div className="portal-panel-head"><h2>Addresses</h2></div>
          <div className="portal-panel-body">
            <Field label="Billing" value={addressSummary(customer.billingAddress)} />
            <Field label="Primary shipping" value={addressSummary(customer.shippingAddress)} />
            {otherAddresses.length ? (
              <div className="portal-copy">
                <span className="portal-eyebrow">Other shipping addresses</span>
                <ul className="portal-address-list">
                  {otherAddresses.map((a) => (
                    <li key={a.id}><span className="portal-address-summary">{addressSummary(a)}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <CredentialsSection customerId={customer.id} />

      <section className="portal-panel">
        <div className="portal-panel-head"><h2>Jobs</h2></div>
        <div className="portal-toolbar">
          <select aria-label="Filter by status" onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            <option value="">All statuses</option>
            {Object.entries(JOB_STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="portal-toolbar-date">
            Created after
            <input aria-label="Created after" onChange={(e) => setCreatedFrom(e.target.value)} type="date" value={createdFrom} />
          </label>
          <label className="portal-toolbar-date">
            Created before
            <input aria-label="Created before" onChange={(e) => setCreatedTo(e.target.value)} type="date" value={createdTo} />
          </label>
          {statusFilter || createdFrom || createdTo ? (
            <button
              className="portal-btn small"
              onClick={() => {
                setStatusFilter("");
                setCreatedFrom("");
                setCreatedTo("");
              }}
              type="button"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Job name</th>
                <th>Stage</th>
                <th>In-hand date</th>
                <th>Decoration</th>
                <th className="r">Quantity</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length ? (
                filteredJobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <button className="portal-link" onClick={() => setEditingJobId(j.id)} type="button">
                        {j.jobName || "Untitled job"}
                      </button>
                    </td>
                    <td>{JOB_STATUS_LABEL[j.status]}</td>
                    <td>{j.inHandDate ? fmtInHandDate(j.inHandDate) : ""}</td>
                    <td>{j.decorationType}</td>
                    <td className="r">{j.quantity ? count.format(j.quantity) : ""}</td>
                    <td>{fmtDate(j.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="portal-col-empty" colSpan={6}>
                    {jobs.length ? "No jobs match those filters." : "No jobs yet for this customer."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <CustomerModal
          close={() => setEditing(false)}
          customer={customer}
          onSaved={async () => {
            router.refresh();
          }}
          salesReps={salesReps}
        />
      ) : null}

      {editingJob ? (
        <JobModal
          close={() => setEditingJobId(null)}
          currentUserName={currentUserName}
          customers={customers}
          job={editingJob}
          onSaved={reloadJobs}
          reloadCustomers={reloadCustomers}
          reloadTasks={reloadTasks}
          salesReps={salesReps}
          staffUsers={staffUsers}
          suggestions={suggestions}
          tasks={tasks}
        />
      ) : null}
    </div>
  );
}
