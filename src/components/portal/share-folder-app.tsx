"use client";

import { useMemo, useState } from "react";
import { LogoMark } from "@/components/logo";
import { ImageLightbox, isImageFile } from "./image-lightbox";

type SharedFile = {
  id: number;
  fileName: string;
  url: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

function fmtFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Saves an in-memory blob under a chosen filename -- works everywhere, including for a blob fetched from another origin, since by this point the data is already local. */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function readError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || "That didn't work. Try again.";
}

function useFeedbackForm(token: string) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/files/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "That didn't send. Try again.");
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return { name, setName, email, setEmail, message, setMessage, busy, error, sent, setSent, submit };
}

/** A feedback form at the bottom of the share page -- kept simple, no reply flow, just a note staff can read. */
function FeedbackForm({ token }: { token: string }) {
  const form = useFeedbackForm(token);

  if (form.sent) {
    return (
      <section className="portal-panel portal-feedback">
        <div className="portal-panel-head"><h2>Thanks!</h2></div>
        <div className="portal-panel-body">
          <p className="portal-msg ok">Your feedback was sent.</p>
          <button className="portal-btn small" onClick={() => form.setSent(false)} type="button">Send another note</button>
        </div>
      </section>
    );
  }

  return (
    <section className="portal-panel portal-feedback">
      <div className="portal-panel-head"><h2>Leave feedback</h2></div>
      <form onSubmit={form.submit}>
        <div className="portal-panel-body">
          <div className="portal-row">
            <label className="portal-field">Name<input onChange={(e) => form.setName(e.target.value)} value={form.name} /></label>
            <label className="portal-field">Email<input onChange={(e) => form.setEmail(e.target.value)} type="email" value={form.email} /></label>
          </div>
          <label className="portal-field">
            Message
            <textarea onChange={(e) => form.setMessage(e.target.value)} rows={3} value={form.message} />
          </label>
          {form.error ? <p className="portal-msg err" role="alert">{form.error}</p> : null}
          <span className="portal-row-actions">
            <button className="portal-btn primary" disabled={form.busy || !form.message.trim()} type="submit">
              {form.busy ? "Sending…" : "Send feedback"}
            </button>
          </span>
        </div>
      </form>
    </section>
  );
}

export function ShareFolderApp({ token, logoUrl, brandName }: { token: string; logoUrl: string; brandName: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<{ title: string; files: SharedFile[] } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const imageFiles = useMemo(() => (folder?.files || []).filter((f) => isImageFile(f.contentType)), [folder]);

  async function downloadAll() {
    if (downloadingAll) return;
    setDownloadingAll(true);
    setDownloadError("");
    try {
      const response = await fetch(`/api/files/${token}/download-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      saveBlob(await response.blob(), `${folder?.title || "files"}.zip`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setDownloadingAll(false);
    }
  }

  async function downloadFile(file: SharedFile) {
    if (downloadingId) return;
    setDownloadingId(file.id);
    setDownloadError("");
    try {
      const response = await fetch(`/api/files/${token}/download/${file.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      saveBlob(await response.blob(), file.fileName);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/files/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; folder?: { title: string; files: SharedFile[] } };
      if (!data.ok || !data.folder) throw new Error(data.error || "That password isn't right.");
      setFolder(data.folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That password isn't right.");
    } finally {
      setBusy(false);
    }
  }

  if (!folder) {
    return (
      <div className="portal-crm portal-share-gate">
        <div className="portal-share-brand">
          <LogoMark brandName={brandName} logoUrl={logoUrl} size={44} />
        </div>
        <div className="portal-title-row">
          <div>
            <span className="portal-eyebrow">Shared files</span>
            <h1>Enter password</h1>
          </div>
        </div>
        <form onSubmit={unlock}>
          <label className="portal-field">
            Password
            <input autoFocus onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
          </label>
          {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
          <span className="portal-row-actions">
            <button className="portal-btn primary" disabled={busy || !password.trim()} type="submit">
              {busy ? "Checking…" : "View files"}
            </button>
          </span>
        </form>
      </div>
    );
  }

  return (
    <div className="portal-crm portal-share-files">
      <div className="portal-share-brand">
        <LogoMark brandName={brandName} logoUrl={logoUrl} size={44} />
      </div>
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Shared files</span>
          <h1>{folder.title}</h1>
        </div>
        {folder.files.length ? (
          <button className="portal-btn primary" disabled={downloadingAll} onClick={() => void downloadAll()} type="button">
            {downloadingAll ? "Zipping…" : "Download All"}
          </button>
        ) : null}
      </div>
      {downloadError ? <p className="portal-msg err" role="alert">{downloadError}</p> : null}
      {folder.files.length ? (
        <div className="portal-table-wrap">
          <table className="portal-table portal-file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Uploaded</th>
                <th className="r">Size</th>
              </tr>
            </thead>
            <tbody>
              {folder.files.map((f) => (
                <tr key={f.id}>
                  <td>
                    {isImageFile(f.contentType) ? (
                      <span className="portal-row-actions">
                        <button
                          className="portal-file-name"
                          onClick={() => setLightboxIndex(imageFiles.findIndex((img) => img.id === f.id))}
                          type="button"
                        >
                          {f.fileName}
                        </button>
                        <button
                          aria-label={`Download ${f.fileName}`}
                          className="portal-btn small"
                          disabled={downloadingId === f.id}
                          onClick={() => void downloadFile(f)}
                          type="button"
                        >
                          {downloadingId === f.id ? "Downloading…" : "Download"}
                        </button>
                      </span>
                    ) : (
                      <a href={f.url} rel="noreferrer" target="_blank">{f.fileName}</a>
                    )}
                  </td>
                  <td className="portal-muted">{fmtDate(f.createdAt)}</td>
                  <td className="r portal-muted">{fmtFileSize(f.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="portal-muted small">No files in this folder yet.</p>
      )}
      {lightboxIndex !== null ? (
        <ImageLightbox files={imageFiles} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      ) : null}

      <FeedbackForm token={token} />
    </div>
  );
}
