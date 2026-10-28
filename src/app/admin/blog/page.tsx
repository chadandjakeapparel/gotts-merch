"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";
type PhotoStatus = "idle" | "uploading" | "error";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function AdminBlogPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [photoStatus, setPhotoStatus] = useState<Record<number, PhotoStatus>>({});
  const [photoError, setPhotoError] = useState<Record<number, string>>({});

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
          <h1>Gotts Merch — Blog Editor</h1>
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

  function updatePost(
    index: number,
    field: "slug" | "title" | "excerpt" | "coverImageUrl" | "publishedAt" | "body",
    value: string,
  ) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.blogPosts];
      next[index] = { ...next[index], [field]: value };
      return { ...current, blogPosts: next };
    });
  }

  function addPost() {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        blogPosts: [
          ...current.blogPosts,
          { slug: "", title: "", excerpt: "", coverImageUrl: "", publishedAt: todayIso(), body: "" },
        ],
      };
    });
  }

  function removePost(index: number) {
    setContent((current) => {
      if (!current) return current;
      return { ...current, blogPosts: current.blogPosts.filter((_, itemIndex) => itemIndex !== index) };
    });
    setPhotoStatus((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    setPhotoError((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  async function handleCoverUpload(index: number, file: File) {
    setPhotoStatus((current) => ({ ...current, [index]: "uploading" }));
    setPhotoError((current) => ({ ...current, [index]: "" }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      updatePost(index, "coverImageUrl", data.url);
      setPhotoStatus((current) => ({ ...current, [index]: "idle" }));
    } catch (error) {
      setPhotoStatus((current) => ({ ...current, [index]: "error" }));
      setPhotoError((current) => ({
        ...current,
        [index]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  }

  const slugs = content.blogPosts.map((p) => p.slug.trim().toLowerCase());

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Blog Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/blog" rel="noreferrer" target="_blank">
            View Blog ↗
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
              onChange={(event) => update("blogEyebrow", event.target.value)}
              type="text"
              value={content.blogEyebrow}
            />
          </label>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => update("blogTitle", event.target.value)}
              type="text"
              value={content.blogTitle}
            />
          </label>
          <label>
            <span>Lead paragraph</span>
            <textarea
              onChange={(event) => update("blogLead", event.target.value)}
              rows={2}
              value={content.blogLead}
            />
          </label>
          <p className="gm-admin-hint">
            Use <code>{"{{brandName}}"}</code> anywhere in the lead or a post body to insert your
            site&rsquo;s name automatically. Until the first post is published, the blog page shows a
            &ldquo;check back soon&rdquo; message instead of this intro.
          </p>
        </section>

        <section className="gm-admin-section">
          <h2>
            Posts ({content.blogPosts.length}
            {content.blogPosts.length === 1 ? " post" : " posts"})
          </h2>
          <p className="gm-admin-hint">
            Posts appear on the blog newest-first by publish date, each at its own address
            (/blog/[the slug]). In a body: a blank line starts a new paragraph, <code>## </code>{" "}
            starts a heading, a block of lines each starting with <code>- </code> becomes a bullet
            list, <code>[link text](/some/url)</code> becomes a link, and{" "}
            <code>{"{{brandName}}"}</code> / <code>{"{{inquiryEmail}}"}</code> insert your
            site&rsquo;s current name and contact email.
          </p>
          {content.blogPosts.map((post, index) => {
            const normalizedSlug = post.slug.trim().toLowerCase();
            const duplicateSlug = normalizedSlug && slugs.filter((s) => s === normalizedSlug).length > 1;
            return (
              <div className="gm-admin-card" key={index}>
                <p className="gm-admin-card__label">Post {index + 1}</p>
                <label>
                  <span>Title</span>
                  <input
                    onChange={(event) => {
                      const title = event.target.value;
                      updatePost(index, "title", title);
                      if (!post.slug.trim()) updatePost(index, "slug", slugify(title));
                    }}
                    type="text"
                    value={post.title}
                  />
                </label>
                <label>
                  <span>Address (/blog/...)</span>
                  <input
                    onChange={(event) => updatePost(index, "slug", slugify(event.target.value))}
                    type="text"
                    value={post.slug}
                  />
                </label>
                {duplicateSlug ? (
                  <p className="gm-admin-error">Another post already uses this address.</p>
                ) : null}
                <label>
                  <span>Published date</span>
                  <input
                    onChange={(event) => updatePost(index, "publishedAt", event.target.value)}
                    type="date"
                    value={post.publishedAt}
                  />
                </label>
                <label>
                  <span>Excerpt (shown on the blog index and as the page description)</span>
                  <textarea
                    onChange={(event) => updatePost(index, "excerpt", event.target.value)}
                    rows={2}
                    value={post.excerpt}
                  />
                </label>
                <div className="gm-admin-photo">
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
                    <img alt="" className="gm-admin-photo__preview" src={post.coverImageUrl} />
                  ) : null}
                  <div>
                    <label>
                      <span>Cover photo (optional — JPG, PNG, or WEBP, max 5MB)</span>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleCoverUpload(index, file);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    {photoStatus[index] === "uploading" ? (
                      <p className="gm-admin-hint">Uploading…</p>
                    ) : null}
                    {photoStatus[index] === "error" ? (
                      <p className="gm-admin-error">{photoError[index]}</p>
                    ) : null}
                    {post.coverImageUrl ? (
                      <button
                        className="gm-form-restart"
                        onClick={() => updatePost(index, "coverImageUrl", "")}
                        type="button"
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                </div>
                <label>
                  <span>Body</span>
                  <textarea
                    className="gm-admin-mono"
                    onChange={(event) => updatePost(index, "body", event.target.value)}
                    rows={14}
                    value={post.body}
                  />
                </label>
                {post.slug ? (
                  <a href={`/blog/${post.slug}`} rel="noreferrer" target="_blank">
                    View this post ↗
                  </a>
                ) : null}
                <button className="gm-form-restart" onClick={() => removePost(index)} type="button">
                  Remove post
                </button>
              </div>
            );
          })}
          <button className="gm-btn gm-btn--ghost" onClick={addPost} type="button">
            Add a post
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
