"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminDocumentsPage() {
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
          <h1>Gotts Merch — Get to Know Us Editor</h1>
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

  function updateDoc(index: number, field: "slug" | "title" | "description" | "body", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.documents];
      next[index] = { ...next[index], [field]: value };
      return { ...current, documents: next };
    });
  }

  function addDoc() {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        documents: [...current.documents, { slug: "", title: "", description: "", body: "" }],
      };
    });
  }

  function removeDoc(index: number) {
    setContent((current) => {
      if (!current) return current;
      return { ...current, documents: current.documents.filter((_, itemIndex) => itemIndex !== index) };
    });
  }

  function moveDoc(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (!content || targetIndex < 0 || targetIndex >= content.documents.length) return;

    setContent((current) => {
      if (!current) return current;
      const next = [...current.documents];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, documents: next };
    });
  }

  const slugs = content.documents.map((d) => d.slug.trim().toLowerCase());

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Get to Know Us Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/get-to-know-us" rel="noreferrer" target="_blank">
            View page ↗
          </a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>Page intro</h2>
          <label>
            <span>Eyebrow</span>
            <input
              onChange={(event) => update("getToKnowUsEyebrow", event.target.value)}
              type="text"
              value={content.getToKnowUsEyebrow}
            />
          </label>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => update("getToKnowUsTitle", event.target.value)}
              type="text"
              value={content.getToKnowUsTitle}
            />
          </label>
          <label>
            <span>Lead paragraph</span>
            <textarea
              onChange={(event) => update("getToKnowUsLead", event.target.value)}
              rows={2}
              value={content.getToKnowUsLead}
            />
          </label>
          <p className="gm-admin-hint">
            Use <code>{"{{brandName}}"}</code> anywhere in the lead or a document body to insert your site&rsquo;s
            name automatically.
          </p>
        </section>

        <section className="gm-admin-section">
          <h2>
            Documents ({content.documents.length}
            {content.documents.length === 1 ? " entry" : " entries"})
          </h2>
          <p className="gm-admin-hint">
            Add, remove, or reorder documents — they appear on the Get to Know Us page in this order, each at its
            own address (/get-to-know-us/[the slug]). In a body: a blank line starts a new paragraph,{" "}
            <code>## </code> starts a heading, a block of lines each starting with <code>- </code> becomes a
            bullet list, <code>[link text](/some/url)</code> becomes a link, and{" "}
            <code>{"{{brandName}}"}</code> / <code>{"{{inquiryEmail}}"}</code> insert your site&rsquo;s current
            name and contact email.
          </p>
          {content.documents.map((doc, index) => {
            const normalizedSlug = doc.slug.trim().toLowerCase();
            const duplicateSlug = normalizedSlug && slugs.filter((s) => s === normalizedSlug).length > 1;
            return (
              <div className="gm-admin-card" key={index}>
                <div className="gm-admin-card__header">
                  <p className="gm-admin-card__label">Document {index + 1}</p>
                  <div className="gm-admin-reorder">
                    <button
                      aria-label="Move document up"
                      disabled={index === 0}
                      onClick={() => moveDoc(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Move document down"
                      disabled={index === content.documents.length - 1}
                      onClick={() => moveDoc(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <label>
                  <span>Title</span>
                  <input
                    onChange={(event) => {
                      const title = event.target.value;
                      updateDoc(index, "title", title);
                      if (!doc.slug.trim()) updateDoc(index, "slug", slugify(title));
                    }}
                    type="text"
                    value={doc.title}
                  />
                </label>
                <label>
                  <span>Address (/get-to-know-us/...)</span>
                  <input
                    onChange={(event) => updateDoc(index, "slug", slugify(event.target.value))}
                    type="text"
                    value={doc.slug}
                  />
                </label>
                {duplicateSlug ? (
                  <p className="gm-admin-error">Another document already uses this address.</p>
                ) : null}
                <label>
                  <span>Card description</span>
                  <input
                    onChange={(event) => updateDoc(index, "description", event.target.value)}
                    type="text"
                    value={doc.description}
                  />
                </label>
                <label>
                  <span>Body</span>
                  <textarea
                    className="gm-admin-mono"
                    onChange={(event) => updateDoc(index, "body", event.target.value)}
                    rows={14}
                    value={doc.body}
                  />
                </label>
                {doc.slug ? (
                  <a href={`/get-to-know-us/${doc.slug}`} rel="noreferrer" target="_blank">
                    View this document ↗
                  </a>
                ) : null}
                <button className="gm-form-restart" onClick={() => removeDoc(index)} type="button">
                  Remove document
                </button>
              </div>
            );
          })}
          <button className="gm-btn gm-btn--ghost" onClick={addDoc} type="button">
            Add a document
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
