"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminFaqsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  async function loadContent() {
    const response = await fetch("/api/admin/content");
    if (response.status === 401) {
      setLoadState("needs-login");
      return;
    }
    const data = (await response.json()) as { content: SiteContent };
    setContent(data.content);
    setLoadState("ready");
  }

  useEffect(() => {
    loadContent();
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError("Incorrect password.");
      return;
    }
    setPassword("");
    setLoadState("loading");
    await loadContent();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setContent(null);
    setLoadState("needs-login");
  }

  async function handleSave() {
    if (!content) return;
    setSaveState("saving");
    setSaveError("");
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (!response.ok) {
      setSaveState("error");
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setSaveError(data?.error || "Save failed.");
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  if (loadState === "loading") {
    return (
      <div className="gm-admin gm-admin--centered">
        <p>Loading…</p>
      </div>
    );
  }

  if (loadState === "needs-login") {
    return (
      <div className="gm-admin gm-admin--centered">
        <form className="gm-admin-login" onSubmit={handleLogin}>
          <h1>Gotts Merch — FAQs Editor</h1>
          <label>
            <span>Password</span>
            <input
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {loginError ? <p className="gm-admin-error">{loginError}</p> : null}
          <button className="gm-btn gm-btn--primary" type="submit">
            Log in
          </button>
        </form>
      </div>
    );
  }

  if (!content) return null;

  function update<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.faqItems];
      next[index] = { ...next[index], [field]: value };
      return { ...current, faqItems: next };
    });
  }

  function addFaq() {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        faqItems: [...current.faqItems, { question: "", answer: "" }],
      };
    });
  }

  function removeFaq(index: number) {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        faqItems: current.faqItems.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function moveFaq(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (!content || targetIndex < 0 || targetIndex >= content.faqItems.length) return;

    setContent((current) => {
      if (!current) return current;
      const next = [...current.faqItems];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, faqItems: next };
    });
  }

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — FAQs Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/#faq" rel="noreferrer" target="_blank">
            View FAQ section ↗
          </a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>FAQ section intro</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("faqEyebrow", event.target.value)}
              type="text"
              value={content.faqEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("faqTitle", event.target.value)}
              type="text"
              value={content.faqTitle}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>
            Questions ({content.faqItems.length}
            {content.faqItems.length === 1 ? " entry" : " entries"})
          </h2>
          <p className="gm-admin-hint">
            Add, remove, or reorder questions below — they appear on the homepage in this
            order, and feed the page&rsquo;s FAQ structured data too.
          </p>
          {content.faqItems.map((item, index) => (
            <div className="gm-admin-card" key={index}>
              <div className="gm-admin-card__header">
                <p className="gm-admin-card__label">Question {index + 1}</p>
                <div className="gm-admin-reorder">
                  <button
                    aria-label="Move question up"
                    disabled={index === 0}
                    onClick={() => moveFaq(index, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move question down"
                    disabled={index === content.faqItems.length - 1}
                    onClick={() => moveFaq(index, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <label>
                <span>Question</span>
                <input
                  onChange={(event) => updateFaq(index, "question", event.target.value)}
                  type="text"
                  value={item.question}
                />
              </label>
              <label>
                <span>Answer</span>
                <textarea
                  onChange={(event) => updateFaq(index, "answer", event.target.value)}
                  rows={3}
                  value={item.answer}
                />
              </label>
              <button className="gm-form-restart" onClick={() => removeFaq(index)} type="button">
                Remove question
              </button>
            </div>
          ))}
          <button className="gm-btn gm-btn--ghost" onClick={addFaq} type="button">
            Add a question
          </button>
        </section>
      </div>

      <div className="gm-admin-savebar">
        <button
          className="gm-btn gm-btn--primary"
          disabled={saveState === "saving"}
          onClick={handleSave}
          type="button"
        >
          {saveState === "saving" ? "Saving…" : "Save changes"}
        </button>
        {saveState === "saved" ? <span className="gm-admin-saved">Saved ✓</span> : null}
        {saveState === "error" ? <span className="gm-admin-error">{saveError}</span> : null}
      </div>
    </div>
  );
}
