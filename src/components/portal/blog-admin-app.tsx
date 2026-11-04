"use client";

import { useState } from "react";
import type { BlogPost } from "@/content/site-content";
import { api } from "./api";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const todayIso = () => new Date().toISOString().slice(0, 10);

type Intro = { blogEyebrow: string; blogTitle: string; blogLead: string };
type PhotoStatus = "idle" | "uploading" | "error";

async function uploadCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/portal/admin/blog/upload", { method: "POST", body: formData });
  const data = (await response.json()) as { ok: boolean; url?: string; error?: string };
  if (!data.ok || !data.url) throw new Error(data.error || "Upload failed.");
  return data.url;
}

export function BlogAdminApp({ initial }: { initial: Intro & { blogPosts: BlogPost[] } }) {
  const [intro, setIntro] = useState<Intro>({
    blogEyebrow: initial.blogEyebrow,
    blogTitle: initial.blogTitle,
    blogLead: initial.blogLead,
  });
  const [posts, setPosts] = useState<BlogPost[]>(initial.blogPosts);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [photoStatus, setPhotoStatus] = useState<Record<number, PhotoStatus>>({});
  const [photoError, setPhotoError] = useState<Record<number, string>>({});

  function updateIntro<K extends keyof Intro>(key: K, value: Intro[K]) {
    setIntro((current) => ({ ...current, [key]: value }));
  }

  function updatePost(index: number, field: keyof BlogPost, value: string | boolean) {
    setPosts((current) => current.map((post, i) => (i === index ? { ...post, [field]: value } : post)));
  }

  function addPost() {
    setPosts((current) => [
      ...current,
      { slug: "", title: "", excerpt: "", coverImageUrl: "", publishedAt: todayIso(), body: "", published: false },
    ]);
  }

  function removePost(index: number) {
    setPosts((current) => current.filter((_, i) => i !== index));
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
      const url = await uploadCover(file);
      updatePost(index, "coverImageUrl", url);
      setPhotoStatus((current) => ({ ...current, [index]: "idle" }));
    } catch (err) {
      setPhotoStatus((current) => ({ ...current, [index]: "error" }));
      setPhotoError((current) => ({ ...current, [index]: err instanceof Error ? err.message : "Upload failed." }));
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaveState("saving");
    setError("");
    try {
      await api("PATCH", "/api/portal/admin/blog", { ...intro, blogPosts: posts });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  const slugs = posts.map((p) => p.slug.trim().toLowerCase());
  const liveCount = posts.filter((p) => p.published).length;

  return (
    <form className="portal-crm" onSubmit={handleSave}>
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Blog</h1>
        </div>
        <span className="portal-row-actions">
          <a className="portal-btn" href="/blog" rel="noreferrer" target="_blank">View blog ↗</a>
        </span>
      </div>
      <p className="portal-hint">
        {posts.length} {posts.length === 1 ? "post" : "posts"} — {liveCount} live, {posts.length - liveCount} draft.
        A new post starts as a draft, visible only via its own link below, until you check Published.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <section className="portal-panel">
        <div className="portal-panel-head"><h2>Page intro</h2></div>
        <div className="portal-panel-body">
          <label className="portal-field">Eyebrow<input onChange={(e) => updateIntro("blogEyebrow", e.target.value)} value={intro.blogEyebrow} /></label>
          <label className="portal-field">Title<input onChange={(e) => updateIntro("blogTitle", e.target.value)} value={intro.blogTitle} /></label>
          <label className="portal-field">
            Lead paragraph
            <textarea onChange={(e) => updateIntro("blogLead", e.target.value)} rows={2} value={intro.blogLead} />
          </label>
          <p className="portal-hint">
            Use <code>{"{{brandName}}"}</code> anywhere in the lead or a post body to insert the site&apos;s name
            automatically. Until at least one post is Published, the blog page shows a &ldquo;check back
            soon&rdquo; message instead of this intro.
          </p>
        </div>
      </section>

      {posts.map((post, index) => {
        const normalizedSlug = post.slug.trim().toLowerCase();
        const duplicateSlug = normalizedSlug && slugs.filter((s) => s === normalizedSlug).length > 1;
        return (
          <section className="portal-panel" key={index}>
            <div className="portal-panel-head">
              <h2>Post {index + 1}</h2>
              <span className={`portal-badge${post.published ? " ok" : ""}`}>{post.published ? "Published" : "Draft"}</span>
            </div>
            <div className="portal-panel-body">
              <label className="portal-check">
                <input
                  checked={post.published}
                  onChange={(e) => updatePost(index, "published", e.target.checked)}
                  type="checkbox"
                />
                Published (live on the public blog)
              </label>
              <label className="portal-field">
                Title
                <input
                  onChange={(e) => {
                    const title = e.target.value;
                    updatePost(index, "title", title);
                    if (!post.slug.trim()) updatePost(index, "slug", slugify(title));
                  }}
                  value={post.title}
                />
              </label>
              <label className="portal-field">
                Address (/blog/…)
                <input onChange={(e) => updatePost(index, "slug", slugify(e.target.value))} value={post.slug} />
              </label>
              {duplicateSlug ? <p className="portal-msg err" role="alert">Another post already uses this address.</p> : null}
              <label className="portal-field">
                Published date
                <input onChange={(e) => updatePost(index, "publishedAt", e.target.value)} type="date" value={post.publishedAt} />
              </label>
              <label className="portal-field">
                Excerpt (shown on the blog index and as the page description)
                <textarea onChange={(e) => updatePost(index, "excerpt", e.target.value)} rows={2} value={post.excerpt} />
              </label>
              <div className="portal-row">
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- staff-only admin preview thumbnail
                  <img alt="" src={post.coverImageUrl} style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 4 }} />
                ) : null}
                <div>
                  <label className="portal-field">
                    Cover photo (optional — JPG, PNG, or WEBP, max 5MB)
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleCoverUpload(index, file);
                        e.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  {photoStatus[index] === "uploading" ? <p className="portal-hint">Uploading…</p> : null}
                  {photoStatus[index] === "error" ? <p className="portal-msg err" role="alert">{photoError[index]}</p> : null}
                  {post.coverImageUrl ? (
                    <button className="portal-link" onClick={() => updatePost(index, "coverImageUrl", "")} type="button">
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="portal-field">
                Body
                <textarea className="portal-mono" onChange={(e) => updatePost(index, "body", e.target.value)} rows={14} value={post.body} />
              </label>
              <p className="portal-hint">
                A blank line starts a new paragraph, <code>## </code> starts a heading, a block of lines each
                starting with <code>- </code> becomes a bullet list, <code>[link text](/some/url)</code> becomes a
                link, and <code>{"{{brandName}}"}</code> / <code>{"{{inquiryEmail}}"}</code> insert the site&apos;s
                current name and contact email.
              </p>
              <span className="portal-row-actions">
                {post.slug ? <a className="portal-link" href={`/blog/${post.slug}`} rel="noreferrer" target="_blank">View this post ↗</a> : null}
                <button className="portal-btn danger push-left" onClick={() => removePost(index)} type="button">Remove post</button>
              </span>
            </div>
          </section>
        );
      })}

      <button className="portal-btn" onClick={addPost} type="button">Add a post</button>

      <div className="portal-row">
        <button className="portal-btn primary" disabled={saveState === "saving"} type="submit">
          {saveState === "saving" ? "Saving…" : "Save changes"}
        </button>
        {saveState === "saved" ? <p className="portal-msg ok">Saved ✓</p> : null}
      </div>
    </form>
  );
}
