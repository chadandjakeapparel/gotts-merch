"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/content/site-content";

type LoadState = "loading" | "needs-login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";
type PhotoStatus = "idle" | "uploading" | "error";

function itemsToText(items: string[]): string {
  return items.join("\n");
}

function textToItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [photoStatus, setPhotoStatus] = useState<Record<number, PhotoStatus>>({});
  const [photoError, setPhotoError] = useState<Record<number, string>>({});
  const [logoStatus, setLogoStatus] = useState<PhotoStatus>("idle");
  const [logoError, setLogoError] = useState("");
  const [faviconStatus, setFaviconStatus] = useState<PhotoStatus>("idle");
  const [faviconError, setFaviconError] = useState("");

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
          <h1>Gotts Merch — Site Editor</h1>
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

  function updateCategory(index: number, field: "title" | "description", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.productCategories];
      next[index] = { ...next[index], [field]: value };
      return { ...current, productCategories: next };
    });
  }

  function updateCategoryItems(index: number, value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.productCategories];
      next[index] = { ...next[index], items: textToItems(value) };
      return { ...current, productCategories: next };
    });
  }

  function updateDifferentiator(index: number, field: "title" | "description", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.differentiators];
      next[index] = { ...next[index], [field]: value };
      return { ...current, differentiators: next };
    });
  }

  function updateProcessStep(index: number, field: "title" | "description", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.processSteps];
      next[index] = { ...next[index], [field]: value };
      return { ...current, processSteps: next };
    });
  }

  function updateTeamMember(
    index: number,
    field: "name" | "role" | "bio" | "photoUrl",
    value: string,
  ) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.teamMembers];
      next[index] = { ...next[index], [field]: value };
      return { ...current, teamMembers: next };
    });
  }

  function updateStation(index: number, field: "title" | "description", value: string) {
    setContent((current) => {
      if (!current) return current;
      const next = [...current.activationsStations];
      next[index] = { ...next[index], [field]: value };
      return { ...current, activationsStations: next };
    });
  }

  async function uploadFile(file: File, folder: "team" | "brand" | "favicon"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
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

  async function handlePhotoUpload(index: number, file: File) {
    setPhotoStatus((current) => ({ ...current, [index]: "uploading" }));
    setPhotoError((current) => ({ ...current, [index]: "" }));
    try {
      const url = await uploadFile(file, "team");
      updateTeamMember(index, "photoUrl", url);
      setPhotoStatus((current) => ({ ...current, [index]: "idle" }));
    } catch (error) {
      setPhotoStatus((current) => ({ ...current, [index]: "error" }));
      setPhotoError((current) => ({
        ...current,
        [index]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoStatus("uploading");
    setLogoError("");
    try {
      const url = await uploadFile(file, "brand");
      update("logoUrl", url);
      setLogoStatus("idle");
    } catch (error) {
      setLogoStatus("error");
      setLogoError(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function handleFaviconUpload(file: File) {
    setFaviconStatus("uploading");
    setFaviconError("");
    try {
      const url = await uploadFile(file, "favicon");
      update("faviconUrl", url);
      setFaviconStatus("idle");
    } catch (error) {
      setFaviconStatus("error");
      setFaviconError(error instanceof Error ? error.message : "Upload failed");
    }
  }

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Site Editor</h1>
        <div className="gm-admin-bar__actions">
          <a href="/" target="_blank" rel="noreferrer">
            View site ↗
          </a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>Brand</h2>
          <div className="gm-admin-photo">
            {content.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
              <img alt="" className="gm-admin-photo__preview" src={content.logoUrl} />
            ) : null}
            <div>
              <label>
                <span>Logo mark (icon only, top-left of the site) — JPG, PNG, or WEBP, max 5MB</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <p className="gm-admin-hint">
                This replaces just the icon next to your brand name — leave it
                empty to use the default &ldquo;G&rdquo; mark. The text next
                to it comes from Brand name below, so the two can be changed
                independently.
              </p>
              {logoStatus === "uploading" ? <p className="gm-admin-hint">Uploading…</p> : null}
              {logoStatus === "error" ? <p className="gm-admin-error">{logoError}</p> : null}
              {content.logoUrl ? (
                <button
                  className="gm-form-restart"
                  onClick={() => update("logoUrl", "")}
                  type="button"
                >
                  Remove logo
                </button>
              ) : null}
            </div>
          </div>
          <div className="gm-admin-photo">
            {content.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
              <img alt="" className="gm-admin-photo__preview" src={content.faviconUrl} />
            ) : null}
            <div>
              <label>
                <span>Favicon (browser tab icon) — JPG, PNG, or WEBP, max 5MB</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFaviconUpload(file);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <p className="gm-admin-hint">
                Shown in the browser tab and bookmarks. Leave it empty to use
                the default &ldquo;G&rdquo; mark. A square image works best.
              </p>
              {faviconStatus === "uploading" ? (
                <p className="gm-admin-hint">Uploading…</p>
              ) : null}
              {faviconStatus === "error" ? (
                <p className="gm-admin-error">{faviconError}</p>
              ) : null}
              {content.faviconUrl ? (
                <button
                  className="gm-form-restart"
                  onClick={() => update("faviconUrl", "")}
                  type="button"
                >
                  Remove favicon
                </button>
              ) : null}
            </div>
          </div>
          <label>
            <span>Brand name (nav/footer wordmark text + copyright line)</span>
            <input
              onChange={(event) => update("brandName", event.target.value)}
              type="text"
              value={content.brandName}
            />
          </label>
          <label>
            <span>Tagline (main headline)</span>
            <input
              onChange={(event) => update("tagline", event.target.value)}
              type="text"
              value={content.tagline}
            />
          </label>
          <label>
            <span>Quote request inbox</span>
            <input
              onChange={(event) => update("inquiryEmail", event.target.value)}
              type="email"
              value={content.inquiryEmail}
            />
          </label>
          <label>
            <span>Shop Now link (external store)</span>
            <input
              onChange={(event) => update("shopUrl", event.target.value)}
              type="url"
              value={content.shopUrl}
            />
          </label>
          <label>
            <span>Footer tagline</span>
            <input
              onChange={(event) => update("footerTagline", event.target.value)}
              type="text"
              value={content.footerTagline}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>Link preview (SEO)</h2>
          <p className="gm-admin-hint">
            This is what shows up as the headline and description when someone
            shares the gottsmerch.com link in a text, Slack, or social media —
            separate from the text on the page itself.
          </p>
          <label>
            <span>Preview title</span>
            <input
              onChange={(event) => update("metaTitle", event.target.value)}
              type="text"
              value={content.metaTitle}
            />
          </label>
          <label>
            <span>Preview description</span>
            <textarea
              onChange={(event) => update("metaDescription", event.target.value)}
              rows={3}
              value={content.metaDescription}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>Hero</h2>
          <label>
            <span>Eyebrow</span>
            <input
              onChange={(event) => update("heroEyebrow", event.target.value)}
              type="text"
              value={content.heroEyebrow}
            />
          </label>
          <label>
            <span>Lead paragraph</span>
            <textarea
              onChange={(event) => update("heroLead", event.target.value)}
              rows={4}
              value={content.heroLead}
            />
          </label>
          <label>
            <span>Venue types (one per line, shown as pills)</span>
            <textarea
              onChange={(event) => update("venueTypes", textToItems(event.target.value))}
              rows={6}
              value={itemsToText(content.venueTypes)}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>Product categories</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("productsEyebrow", event.target.value)}
              type="text"
              value={content.productsEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("productsTitle", event.target.value)}
              type="text"
              value={content.productsTitle}
            />
          </label>
          {content.productCategories.map((category, index) => (
            <div className="gm-admin-card" key={category.key}>
              <p className="gm-admin-card__label">{category.key}</p>
              <label>
                <span>Title</span>
                <input
                  onChange={(event) => updateCategory(index, "title", event.target.value)}
                  type="text"
                  value={category.title}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  onChange={(event) => updateCategory(index, "description", event.target.value)}
                  rows={2}
                  value={category.description}
                />
              </label>
              <label>
                <span>Items (one per line)</span>
                <textarea
                  onChange={(event) => updateCategoryItems(index, event.target.value)}
                  rows={5}
                  value={itemsToText(category.items)}
                />
              </label>
            </div>
          ))}
        </section>

        <section className="gm-admin-section">
          <h2>Merch Activations</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("activationsEyebrow", event.target.value)}
              type="text"
              value={content.activationsEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("activationsTitle", event.target.value)}
              type="text"
              value={content.activationsTitle}
            />
          </label>
          <label>
            <span>Lead paragraph</span>
            <textarea
              onChange={(event) => update("activationsLead", event.target.value)}
              rows={3}
              value={content.activationsLead}
            />
          </label>
          <label>
            <span>Stat badge (e.g. &ldquo;250+ live events produced&rdquo;)</span>
            <input
              onChange={(event) => update("activationsStat", event.target.value)}
              type="text"
              value={content.activationsStat}
            />
          </label>
          {content.activationsStations.map((station, index) => (
            <div className="gm-admin-card" key={index}>
              <p className="gm-admin-card__label">Station {index + 1}</p>
              <label>
                <span>Title</span>
                <input
                  onChange={(event) => updateStation(index, "title", event.target.value)}
                  type="text"
                  value={station.title}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  onChange={(event) => updateStation(index, "description", event.target.value)}
                  rows={2}
                  value={station.description}
                />
              </label>
            </div>
          ))}
          <label>
            <span>Process eyebrow</span>
            <input
              onChange={(event) => update("activationsProcessEyebrow", event.target.value)}
              type="text"
              value={content.activationsProcessEyebrow}
            />
          </label>
          <label>
            <span>Process title</span>
            <input
              onChange={(event) => update("activationsProcessTitle", event.target.value)}
              type="text"
              value={content.activationsProcessTitle}
            />
          </label>
          <label>
            <span>Process checklist (one per line)</span>
            <textarea
              onChange={(event) =>
                update("activationsProcessItems", textToItems(event.target.value))
              }
              rows={6}
              value={itemsToText(content.activationsProcessItems)}
            />
          </label>
          <label>
            <span>CTA title</span>
            <input
              onChange={(event) => update("activationsCtaTitle", event.target.value)}
              type="text"
              value={content.activationsCtaTitle}
            />
          </label>
          <label>
            <span>CTA body</span>
            <textarea
              onChange={(event) => update("activationsCtaBody", event.target.value)}
              rows={2}
              value={content.activationsCtaBody}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>Why Gotts Merch</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("whyEyebrow", event.target.value)}
              type="text"
              value={content.whyEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("whyTitle", event.target.value)}
              type="text"
              value={content.whyTitle}
            />
          </label>
          {content.differentiators.map((item, index) => (
            <div className="gm-admin-card" key={index}>
              <label>
                <span>Title</span>
                <input
                  onChange={(event) => updateDifferentiator(index, "title", event.target.value)}
                  type="text"
                  value={item.title}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  onChange={(event) =>
                    updateDifferentiator(index, "description", event.target.value)
                  }
                  rows={2}
                  value={item.description}
                />
              </label>
            </div>
          ))}
        </section>

        <section className="gm-admin-section">
          <h2>Brands</h2>
          <p className="gm-admin-hint">
            Brands have their own workspace now, built for uploading a long list of logos
            without scrolling through the rest of the site — currently{" "}
            {content.brandPartners.length}{" "}
            {content.brandPartners.length === 1 ? "entry" : "entries"}.
          </p>
          <Link className="gm-btn gm-btn--primary" href="/admin/brands">
            Open Brands editor →
          </Link>
        </section>

        <section className="gm-admin-section">
          <h2>About Us</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("aboutEyebrow", event.target.value)}
              type="text"
              value={content.aboutEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("aboutTitle", event.target.value)}
              type="text"
              value={content.aboutTitle}
            />
          </label>
          <label>
            <span>Business history (leading paragraph)</span>
            <textarea
              onChange={(event) => update("aboutHistory", event.target.value)}
              rows={5}
              value={content.aboutHistory}
            />
          </label>
          {content.teamMembers.map((member, index) => (
            <div className="gm-admin-card" key={index}>
              <p className="gm-admin-card__label">Team member {index + 1}</p>
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => updateTeamMember(index, "name", event.target.value)}
                  type="text"
                  value={member.name}
                />
              </label>
              <label>
                <span>Role / title</span>
                <input
                  onChange={(event) => updateTeamMember(index, "role", event.target.value)}
                  type="text"
                  value={member.role}
                />
              </label>
              <label>
                <span>Bio</span>
                <textarea
                  onChange={(event) => updateTeamMember(index, "bio", event.target.value)}
                  rows={4}
                  value={member.bio}
                />
              </label>
              <div className="gm-admin-photo">
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-only preview thumbnail
                  <img alt="" className="gm-admin-photo__preview" src={member.photoUrl} />
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
                  {member.photoUrl ? (
                    <button
                      className="gm-form-restart"
                      onClick={() => updateTeamMember(index, "photoUrl", "")}
                      type="button"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="gm-admin-section">
          <h2>Retail merch callout</h2>
          <label>
            <span>Eyebrow</span>
            <input
              onChange={(event) => update("retailEyebrow", event.target.value)}
              type="text"
              value={content.retailEyebrow}
            />
          </label>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => update("retailTitle", event.target.value)}
              type="text"
              value={content.retailTitle}
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              onChange={(event) => update("retailBody", event.target.value)}
              rows={3}
              value={content.retailBody}
            />
          </label>
          <label>
            <span>Checklist items (one per line)</span>
            <textarea
              onChange={(event) => update("retailListItems", textToItems(event.target.value))}
              rows={4}
              value={itemsToText(content.retailListItems)}
            />
          </label>
        </section>

        <section className="gm-admin-section">
          <h2>How it works</h2>
          <label>
            <span>Section eyebrow</span>
            <input
              onChange={(event) => update("processEyebrow", event.target.value)}
              type="text"
              value={content.processEyebrow}
            />
          </label>
          <label>
            <span>Section title</span>
            <input
              onChange={(event) => update("processTitle", event.target.value)}
              type="text"
              value={content.processTitle}
            />
          </label>
          {content.processSteps.map((step, index) => (
            <div className="gm-admin-card" key={step.number}>
              <p className="gm-admin-card__label">Step {step.number}</p>
              <label>
                <span>Title</span>
                <input
                  onChange={(event) => updateProcessStep(index, "title", event.target.value)}
                  type="text"
                  value={step.title}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  onChange={(event) =>
                    updateProcessStep(index, "description", event.target.value)
                  }
                  rows={2}
                  value={step.description}
                />
              </label>
            </div>
          ))}
        </section>

        <section className="gm-admin-section">
          <h2>Quote request section</h2>
          <label>
            <span>Eyebrow</span>
            <input
              onChange={(event) => update("quoteEyebrow", event.target.value)}
              type="text"
              value={content.quoteEyebrow}
            />
          </label>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => update("quoteTitle", event.target.value)}
              type="text"
              value={content.quoteTitle}
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              onChange={(event) => update("quoteBody", event.target.value)}
              rows={3}
              value={content.quoteBody}
            />
          </label>
          <label>
            <span>Note (shown in italic below the body)</span>
            <textarea
              onChange={(event) => update("quoteNote", event.target.value)}
              rows={2}
              value={content.quoteNote}
            />
          </label>
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
