"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Customer, Job, SalesRep } from "@/lib/portal/types";
import { api } from "./api";
import { addressSummary, CustomerModal, customerTitle } from "./customers-app";

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

export function CustomerDetailApp({
  customer,
  jobs,
  salesReps,
}: {
  customer: Customer;
  jobs: Job[];
  salesReps: SalesRep[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const repName = salesReps.find((r) => r.id === customer.salesRepId)?.name || "Unassigned";
  const otherAddresses = customer.shippingAddresses.filter((a) => !a.isPrimary);
  const activeJobs = jobs.filter((j) => j.status !== "delivered").length;

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
      {deleteError ? <p className="portal-msg err" role="alert">{deleteError}</p> : null}

      <section aria-label="Summary" className="portal-summary">
        <div><span className="portal-eyebrow">Total jobs</span><strong>{count.format(jobs.length)}</strong></div>
        <div><span className="portal-eyebrow">Active jobs</span><strong>{count.format(activeJobs)}</strong></div>
        <div><span className="portal-eyebrow">Sales rep</span><strong>{repName}</strong></div>
        <div><span className="portal-eyebrow">Subscribed</span><strong>{customer.subscribed ? "Yes" : "No"}</strong></div>
      </section>

      <div className="portal-detail-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><h2>Contact</h2></div>
          <div className="portal-panel-body">
            {customer.kind === "company" ? <Field label="Point of contact" value={customer.pointOfContact} /> : null}
            <Field label="Phone" value={customer.phone} />
            <Field label="Email" value={customer.emails.length ? customer.emails.join(", ") : ""} />
            <Field label="Inventory held" value={customer.inventoryHeld ? "Yes" : "No"} />
            <Field label="Notes" value={customer.notes} />
          </div>
        </section>

        <section className="portal-panel">
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

      <section className="portal-panel">
        <div className="portal-panel-head"><h2>Jobs</h2></div>
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
              {jobs.length ? (
                jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.jobName || "Untitled job"}</td>
                    <td>{JOB_STATUS_LABEL[j.status]}</td>
                    <td>{j.inHandDate ? fmtInHandDate(j.inHandDate) : ""}</td>
                    <td>{j.decorationType}</td>
                    <td className="r">{j.quantity ? count.format(j.quantity) : ""}</td>
                    <td>{fmtDate(j.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="portal-col-empty" colSpan={6}>No jobs yet for this customer.</td></tr>
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
    </div>
  );
}
