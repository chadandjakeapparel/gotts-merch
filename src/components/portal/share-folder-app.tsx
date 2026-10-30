"use client";

import { useState } from "react";

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

export function ShareFolderApp({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<{ name: string; files: SharedFile[] } | null>(null);

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
      const data = (await response.json()) as { ok: boolean; error?: string; folder?: { name: string; files: SharedFile[] } };
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
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Shared files</span>
          <h1>{folder.name}</h1>
        </div>
      </div>
      {folder.files.length ? (
        <ul className="portal-file-list">
          {folder.files.map((f) => (
            <li key={f.id}>
              <a href={f.url} rel="noreferrer" target="_blank">{f.fileName}</a>
              <span className="portal-muted small">{fmtFileSize(f.size)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-muted small">No files in this folder yet.</p>
      )}
    </div>
  );
}
