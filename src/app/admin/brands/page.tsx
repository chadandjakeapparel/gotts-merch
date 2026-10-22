"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";
type PhotoStatus = "idle" | "uploading" | "error";

// Swaps whatever is stored at two indexes (e.g. per-row upload status),
// keeping each value attached to its row when brands are reordered.
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

export default function AdminBrandsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [brandLogoStatus, setBrandLogoStatus] = useState<Record<number, PhotoStatus>>({});
  const [brandLogoError, setBrandLogoError] = useState<Record<number, string>>({});

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
          <h1>Gotts Merch — Brands Editor</h1>
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

  function updateBrand(index: number, field: "name" | "description" | "logoUrl", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.brandPartners];
      next[index] = { ...next[index], [field]: value };
      return { ...current, brandPartners: next };
    });
  }

  function addBrand() {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        brandPartners: [...current.brandPartners, { name: "", description: "", logoUrl: "" }],
      };
    });
  }

  function removeBrand(index: number) {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        brandPartners: current.brandPartners.filter((_, itemIndex) => itemIndex !== index),
      };
    });
    setBrandLogoStatus((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    setBrandLogoError((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  function moveBrand(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (!content || targetIndex < 0 || targetIndex >= content.brandPartners.length) return;

    setContent((current) => {
      if (!current) return current;
      const next = [...current.brandPartners];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, brandPartners: next };
    });
    setBrandLogoStatus((current) => swapIndexed(current, index, targetIndex));
    setBrandLogoError((current) => swapIndexed(current, index, targetIndex));
  }

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "brand");
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
    if (!response.ok || !data.ok || !data.url) {
      throw new Error(data.error || "Upload failed");
    }
    return data.url;
  }

  async function handleBrandLogoUpload(index: number, file: File) {
    setBrandLogoStatus((current) => ({ ...current, [index]: "uploading" }));
    setBrandLogoError((current) => ({ ...current, [index]: "" }));
    try {
      const url = await uploadFile(file);
      updateBrand(index, "logoUrl", url);
      setBrandLogoStatus((current) => ({ ...current, [index]: "idle" }));
    } catch (error) {
      setBrandLogoStatus((current) => ({ ...current, [index]: "error" }));
      setBrandLogoError((current) => ({
        ...current,
        [index]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  }

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Brands Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/brands" rel="noreferrer" target="_blank">
            View Brands page ↗
          </a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>Brands page intro</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("brandsEyebrow", event.target.value)}
              type="text"
              value={content.brandsEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("brandsTitle", event.target.value)}
              type="text"
              value={content.brandsTitle}
            />
          </label>
          <label>
            <span>Lead paragraph</span>
            <textarea
              onChange={(event) => update("brandsLead", event.target.value)}
              rows={2}
              value={content.brandsLead}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>
            Brands ({content.brandPartners.length}
            {content.brandPartners.length === 1 ? " entry" : " entries"})
          </h2>
          <p className="gm-admin-hint">
            Add, remove, or reorder brands below — there&rsquo;s no limit on how many you can add.
          </p>
          {content.brandPartners.map((brand, index) => (
            <div className="gm-admin-card" key={index}>
              <div className="gm-admin-card__header">
                <p className="gm-admin-card__label">Brand {index + 1}</p>
                <div className="gm-admin-reorder">
                  <button
                    aria-label="Move brand up"
                    disabled={index === 0}
                    onClick={() => moveBrand(index, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move brand down"
                    disabled={index === content.brandPartners.length - 1}
                    onClick={() => moveBrand(index, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => updateBrand(index, "name", event.target.value)}
                  type="text"
                  value={brand.name}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  onChange={(event) => updateBrand(index, "description", event.target.value)}
                  rows={2}
                  value={brand.description}
                />
              </label>
              <div className="gm-admin-photo">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
                  <img alt="" className="gm-admin-photo__preview" src={brand.logoUrl} />
                ) : null}
                <div>
                  <label>
                    <span>Logo (JPG, PNG, or WEBP — max 5MB)</span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleBrandLogoUpload(index, file);
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  {brandLogoStatus[index] === "uploading" ? (
                    <p className="gm-admin-hint">Uploading…</p>
                  ) : null}
                  {brandLogoStatus[index] === "error" ? (
                    <p className="gm-admin-error">{brandLogoError[index]}</p>
                  ) : null}
                  {brand.logoUrl ? (
                    <button
                      className="gm-form-restart"
                      onClick={() => updateBrand(index, "logoUrl", "")}
                      type="button"
                    >
                      Remove logo
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                className="gm-form-restart"
                onClick={() => removeBrand(index)}
                type="button"
              >
                Remove brand
              </button>
            </div>
          ))}
          <button className="gm-btn gm-btn--ghost" onClick={addBrand} type="button">
            Add a brand
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
