"use client";

import { useState } from "react";
import { api } from "./api";

export function AccountForm({ email, mustChange, minLength }: { email: string; mustChange: boolean; minLength: number }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (next.length < minLength) return setMessage({ kind: "err", text: `Use at least ${minLength} characters for the new password.` });
    if (next !== confirm) return setMessage({ kind: "err", text: "The new passwords don't match." });
    setBusy(true);
    setMessage(null);
    try {
      await api("POST", "/api/portal/password", { current, next });
      if (mustChange) {
        window.location.assign("/portal");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ kind: "ok", text: "Password changed. You've been signed out on other devices." });
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "The password couldn't be changed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-panel">
      <form className="portal-form" onSubmit={submit}>
        <div>
          <span className="portal-eyebrow">My account</span>
          <h1>{mustChange ? "Choose your own password" : "Change password"}</h1>
          <p className="portal-muted">
            {mustChange
              ? "You signed in with a temporary password. Set one only you know to continue."
              : <>Signed in as <strong>{email}</strong>.</>}
          </p>
        </div>
        <input autoComplete="username" hidden readOnly type="email" value={email} />
        <label className="portal-field">{mustChange ? "Temporary password" : "Current password"}
          <input autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} required type="password" value={current} />
        </label>
        <label className="portal-field">New password
          <input autoComplete="new-password" minLength={minLength} onChange={(e) => setNext(e.target.value)} required type="password" value={next} />
        </label>
        <label className="portal-field">Confirm new password
          <input autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} required type="password" value={confirm} />
        </label>
        <p className="portal-hint">At least {minLength} characters. A short phrase is easier to remember than a jumble of symbols.</p>
        {message ? <p className={`portal-msg ${message.kind}`} role={message.kind === "err" ? "alert" : "status"}>{message.text}</p> : null}
        <button className="portal-btn primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </section>
  );
}
