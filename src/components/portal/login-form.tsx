"use client";

import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; mustChangePassword?: boolean };
      if (!data.ok) throw new Error(data.error || "That email and password don't match.");
      window.location.assign(data.mustChangePassword ? "/portal/account?welcome=1" : "/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="portal-login">
      <form className="portal-login-card" onSubmit={submit}>
        <span className="portal-eyebrow">Client portal</span>
        <h1>Sign in</h1>
        <p className="portal-muted">See the inventory we hold for you and follow your orders from received to shipped.</p>
        <label className="portal-field" htmlFor="portal-email">
          Email
          <input autoComplete="username" autoFocus id="portal-email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        </label>
        <label className="portal-field" htmlFor="portal-password">
          Password
          <input autoComplete="current-password" id="portal-password" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
        </label>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
        <button className="portal-btn primary" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
        <p className="portal-hint">Forgot your password? Contact your account manager and they&apos;ll send you a new temporary one.</p>
      </form>
    </main>
  );
}
