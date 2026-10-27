"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";
type PhotoStatus = "idle" | "uploading" | "error";

// Swaps whatever is stored at two indexes (e.g. per-row upload status),
// keeping each value attached to its row when photos are reordered.
function swapIndexed<T>(map: Record<number, T>, a: number, b: number): Record<number, T> {
  const next = { ...map };
  const valueAtA = map[a];
  const valueAtB = map[b];
  if (valueAtB === undefined) delete next[a];
  else next[a] = valueAtB;
  if (valueAtA === undefined) delete next[b];
  else next[b] = valueAtA;
  return next;
}

export default function AdminGolfGalleryPage() {
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
          <h1>Gotts Merch — Golf Gallery Editor</h1>
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

  function updatePhoto(index: number, field: "url" | "caption", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.golfGallery];
      next[index] = { ...next[index], [field]: value };
      return { ...current, golfGallery: next };
    });
  }

  function removePhoto(index: number) {
    setContent((current) => {
      if (!current) return current;
      return { ...current, golfGallery: current.golfGallery.filter((_, itemIndex) => itemIndex !== index) };
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

  function movePhoto(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (!content || targetIndex < 0 || targetIndex >= content.golfGallery.length) return;

    setContent((current) => {
      if (!current) return current;
      const next = [...current.golfGallery];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, golfGallery: next };
    });
    setPhotoStatus((current) => swapIndexed(current, index, targetIndex));
    setPhotoError((current) => swapIndexed(current, index, targetIndex));
  }

  async function handlePhotoUpload(index: number, file: File) {
    setPhotoStatus((current) => ({ ...current, [index]: "uploading" }));
    setPhotoError((current) => ({ ...current, [index]: "" }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "golf-gallery");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      updatePhoto(index, "url", data.url);
      setPhotoStatus((current) => ({ ...current, [index]: "idle" }));
    } catch (error) {
      setPhotoStatus((current) => ({ ...current, [index]: "error" }));
      setPhotoError((current) => ({
        ...current,
        [index]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  }

  function addPhoto() {
    setContent((current) => {
      if (!current) return current;
      return { ...current, golfGallery: [...current.golfGallery, { url: "", caption: "" }] };
    });
  }

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Golf Gallery Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/charity-golf-tournaments" rel="noreferrer" target="_blank">
            View Golf Tournaments page ↗
          </a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>
            Photos ({content.golfGallery.length}
            {content.golfGallery.length === 1 ? " photo" : " photos"})
          </h2>
          <p className="gm-admin-hint">
            Product shots and photos from past tournaments, shown in the gallery on the Charity
            Golf Tournaments page. Add, remove, or reorder photos below — there&rsquo;s no limit
            on how many you can add. The caption is optional and only shows when a visitor clicks
            a photo to enlarge it.
          </p>
          {content.golfGallery.map((photo, index) => (
            <div className="gm-admin-card" key={index}>
              <div className="gm-admin-card__header">
                <p className="gm-admin-card__label">Photo {index + 1}</p>
                <div className="gm-admin-reorder">
                  <button
                    aria-label="Move photo up"
                    disabled={index === 0}
                    onClick={() => movePhoto(index, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move photo down"
                    disabled={index === content.golfGallery.length - 1}
                    onClick={() => movePhoto(index, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="gm-admin-photo">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
                  <img alt="" className="gm-admin-photo__preview" src={photo.url} />
                ) : null}
                <div>
                  <label>
                    <span>Photo (JPG, PNG, or WEBP — max 5MB)</span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handlePhotoUpload(index, file);
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
                </div>
              </div>
              <label>
                <span>Caption (optional)</span>
                <input
                  onChange={(event) => updatePhoto(index, "caption", event.target.value)}
                  placeholder="e.g. 2025 Smith Foundation Golf Classic"
                  type="text"
                  value={photo.caption}
                />
              </label>
              <button className="gm-form-restart" onClick={() => removePhoto(index)} type="button">
                Remove photo
              </button>
            </div>
          ))}
          <button className="gm-btn gm-btn--ghost" onClick={addPhoto} type="button">
            Add a photo
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
