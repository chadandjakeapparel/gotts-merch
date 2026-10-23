"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClientSummary, PortalUser } from "@/lib/portal/types";
import { api } from "./api";

const count = new Intl.NumberFormat("en-US");

function fmtDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="portal-copy">
      <span className="portal-eyebrow">{label}</span>
      <div>
        <input aria-label={label} onFocus={(e) => e.target.select()} readOnly value={value} />
        <button
          className="portal-btn small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function AdminApp({
  initialClients,
  initialUsers,
  currentUserId,
}: {
  initialClients: ClientSummary[];
  initialUsers: PortalUser[];
  currentUserId: number;
}) {
  const [clients, setClients] = useState(initialClients);
  const [users, setUsers] = useState(initialUsers);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<{ email: string; password: string; created: boolean } | null>(null);
  const [newClient, setNewClient] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [login, setLogin] = useState({ email: "", name: "", clientId: initialClients[0] ? String(initialClients[0].id) : "staff" });
  const [busy, setBusy] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  async function reload() {
    const [c, u] = await Promise.all([
      api<{ clients: ClientSummary[] }>("GET", "/api/portal/admin/clients"),
      api<{ users: PortalUser[] }>("GET", "/api/portal/admin/users"),
    ]);
    setClients(c.clients);
    setUsers(u.users);
  }

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

  const clientNames = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="portal-admin">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Clients &amp; logins</h1>
        </div>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      {secret ? (
        <section className="portal-panel portal-secret" role="status">
          <h2>{secret.created ? "Login created" : "Password reset"}</h2>
          <p>
            Send these to <strong>{secret.email}</strong>. The temporary password is shown only once, and they&apos;ll be asked to choose
            their own when they first sign in.
          </p>
          <div className="portal-row">
            <CopyField label="Sign-in page" value={`${origin}/portal/login`} />
            <CopyField label="Temporary password" value={secret.password} />
          </div>
          <button className="portal-btn" onClick={() => setSecret(null)} type="button">Done</button>
        </section>
      ) : null}

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Clients</h2>
          <form
            className="portal-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newClient.trim();
              if (!name) return;
              void run(async () => {
                await api("POST", "/api/portal/admin/clients", { name });
                setNewClient("");
              });
            }}
          >
            <input aria-label="New client name" onChange={(e) => setNewClient(e.target.value)} placeholder="New client name" value={newClient} />
            <button className="portal-btn primary" disabled={busy || !newClient.trim()} type="submit">Add client</button>
          </form>
        </div>
        {clients.length ? (
          <ul className="portal-clients">
            {clients.map((c) => (
              <li key={c.id}>
                <div className="portal-client-head">
                  {editing?.id === c.id ? (
                    <form
                      className="portal-inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          await api("PATCH", `/api/portal/admin/clients/${c.id}`, { name: editing.name });
                          setEditing(null);
                        });
                      }}
                    >
                      <input aria-label="Client name" autoFocus onChange={(e) => setEditing({ id: c.id, name: e.target.value })} value={editing.name} />
                      <button className="portal-btn small primary" disabled={busy} type="submit">Save</button>
                      <button className="portal-btn small" onClick={() => setEditing(null)} type="button">Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h3>{c.name}</h3>
                      <button className="portal-link" onClick={() => setEditing({ id: c.id, name: c.name })} type="button">Rename</button>
                    </>
                  )}
                  <Link className="portal-btn small push-left" href={`/portal?client=${c.id}`}>Open inventory</Link>
                </div>
                <p className="portal-muted small">
                  {count.format(c.itemCount)} style lines · {count.format(c.units)} units · {count.format(c.openOrders)} open orders · {count.format(c.userCount)} logins
                </p>
                <CopyField label="JotForm webhook link" value={origin ? `${origin}/api/jotform?key=${c.webhookKey}` : ""} />
                {confirming === `rotate-${c.id}` ? (
                  <p className="portal-msg warn">
                    The current link stops working right away, so the client&apos;s JotForm needs the new one.{" "}
                    <button className="portal-link" onClick={() => void run(async () => { await api("PATCH", `/api/portal/admin/clients/${c.id}`, { action: "rotate" }); setConfirming(null); })} type="button">
                      Make a new link
                    </button>{" "}
                    · <button className="portal-link" onClick={() => setConfirming(null)} type="button">Keep current link</button>
                  </p>
                ) : (
                  <button className="portal-link small" onClick={() => setConfirming(`rotate-${c.id}`)} type="button">Replace this link</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="portal-empty">
            <p className="portal-muted">Add a client to give them their own inventory, orders, JotForm link and logins.</p>
          </div>
        )}
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Logins</h2>
        </div>
        <form
          className="portal-login-add"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const staff = login.clientId === "staff";
              const res = await api<{ email: string; password: string }>("POST", "/api/portal/admin/users", {
                email: login.email,
                name: login.name,
                role: staff ? "staff" : "client",
                clientId: staff ? null : Number(login.clientId),
              });
              setSecret({ ...res, created: true });
              setLogin({ ...login, email: "", name: "" });
            });
          }}
        >
          <label className="portal-field">Email<input onChange={(e) => setLogin({ ...login, email: e.target.value })} required type="email" value={login.email} /></label>
          <label className="portal-field">Name<input onChange={(e) => setLogin({ ...login, name: e.target.value })} value={login.name} /></label>
          <label className="portal-field">Access
            <select onChange={(e) => setLogin({ ...login, clientId: e.target.value })} value={login.clientId}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} (view only)</option>)}
              <option value="staff">Staff: full admin access</option>
            </select>
          </label>
          <button className="portal-btn primary" disabled={busy} type="submit">Create login</button>
        </form>
        <p className="portal-hint portal-login-add-hint">
          &quot;Staff&quot; logins all have the same full access — inventory, orders, CRM, and this page. The
          only difference is the account owner (marked below) can&apos;t be removed by another staff login.
        </p>

        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Access</th><th>Last sign-in</th><th className="r"><span className="portal-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.isOwner ? <span className="portal-pill ok">Owner</span> : null}{u.mustChangePassword ? <span className="portal-pill low">Temporary password</span> : null}</td>
                  <td>{u.name}</td>
                  <td>{u.role === "staff" ? <strong>Staff</strong> : clientNames.get(u.clientId ?? 0) || "Unknown client"}</td>
                  <td>{fmtDate(u.lastLoginAt)}</td>
                  <td className="r">
                    {confirming === `delete-${u.id}` ? (
                      <span className="portal-row-actions">
                        <button className="portal-btn small danger" disabled={busy} onClick={() => void run(async () => { await api("DELETE", `/api/portal/admin/users/${u.id}`); setConfirming(null); })} type="button">Remove login</button>
                        <button className="portal-btn small" onClick={() => setConfirming(null)} type="button">Keep</button>
                      </span>
                    ) : (
                      <span className="portal-row-actions">
                        {u.id === currentUserId ? <Link className="portal-btn small" href="/portal/account">Change my password</Link> : null}
                        {u.id !== currentUserId ? <button
                          className="portal-btn small"
                          disabled={busy}
                          onClick={() => void run(async () => {
                            const res = await api<{ email: string; password: string }>("PATCH", `/api/portal/admin/users/${u.id}`, { action: "reset" });
                            setSecret({ ...res, created: false });
                          })}
                          type="button"
                        >
                          Reset password
                        </button> : null}
                        {u.id !== currentUserId && !u.isOwner ? (
                          <button className="portal-btn small danger" onClick={() => setConfirming(`delete-${u.id}`)} type="button">Remove</button>
                        ) : null}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
