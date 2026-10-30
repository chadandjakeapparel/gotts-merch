"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FileFolder, FolderFile } from "@/lib/portal/types";
import { api } from "./api";

const count = new Intl.NumberFormat("en-US");

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useSubmit(onDone: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (run: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}

function ModalFrame({
  title,
  children,
  footer,
  close,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  close: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="portal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div aria-modal="true" className="portal-modal" role="dialog">
        <div className="portal-modal-head"><h2>{title}</h2></div>
        <div className="portal-modal-body">{children}</div>
        <div className="portal-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

export function FilesApp({ initialFolders, loadError }: { initialFolders: FileFolder[]; loadError: string }) {
  const [folders, setFolders] = useState(initialFolders);
  const [error, setError] = useState(loadError);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    try {
      const res = await api<{ folders: FileFolder[] }>("GET", "/api/portal/files");
      setFolders(res.folders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The folder list couldn't be refreshed.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, query]);

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Internal</span>
          <h1>Files</h1>
        </div>
        <button className="portal-btn primary" onClick={() => setAdding(true)} type="button">New folder</button>
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-toolbar">
        <input
          aria-label="Search folders"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folders…"
          type="search"
          value={query}
        />
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Folder</th>
              <th className="r">Files</th>
              <th>Shared externally</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((f) => (
                <tr key={f.id}>
                  <td><Link className="portal-link" href={`/portal/files/${f.id}`}>{f.name}</Link></td>
                  <td className="r">{count.format(f.files.length)}</td>
                  <td>{f.shareExternally ? <span className="portal-pill ok">Shared</span> : null}</td>
                  <td>{fmtDate(f.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td className="portal-col-empty" colSpan={4}>No folders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? <NewFolderModal close={() => setAdding(false)} onSaved={reload} /> : null}
    </div>
  );
}

function NewFolderModal({ close, onSaved }: { close: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const { busy, error, setError, submit } = useSubmit(async () => {
    await onSaved();
    close();
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the folder a name.");
    void submit(() => api("POST", "/api/portal/files", { name }));
  }

  return (
    <ModalFrame
      close={close}
      footer={
        <>
          <button className="portal-btn" onClick={close} type="button">Cancel</button>
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">Create folder</button>
        </>
      }
      title="New folder"
    >
      <label className="portal-field">Folder name<input autoFocus onChange={(e) => setName(e.target.value)} value={name} /></label>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
    </ModalFrame>
  );
}

export function FolderDetailApp({ folder: initialFolder }: { folder: FileFolder }) {
  const [folder, setFolder] = useState(initialFolder);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    try {
      const res = await api<{ folder: FileFolder }>("GET", `/api/portal/files/${folder.id}`);
      setFolder(res.folder);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This folder couldn't be refreshed.");
    }
  };

  async function saveName() {
    if (!nameDraft.trim()) return;
    try {
      await api("PATCH", `/api/portal/files/${folder.id}`, { name: nameDraft });
      setRenaming(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't rename this folder.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api("DELETE", `/api/portal/files/${folder.id}`);
      window.location.assign("/portal/files");
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Couldn't delete this folder.");
    }
  }

  return (
    <div className="portal-crm">
      <Link className="portal-link" href="/portal/files">← All folders</Link>

      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Folder</span>
          {renaming ? (
            <span className="portal-inline">
              <input autoFocus onChange={(e) => setNameDraft(e.target.value)} value={nameDraft} />
              <button className="portal-btn small primary" onClick={() => void saveName()} type="button">Save</button>
              <button className="portal-btn small" onClick={() => { setRenaming(false); setNameDraft(folder.name); }} type="button">Cancel</button>
            </span>
          ) : (
            <h1>{folder.name}</h1>
          )}
        </div>
        {!renaming ? (
          <span className="portal-row-actions">
            {confirmingDelete ? (
              <>
                <span className="portal-muted small">Delete this folder and its files?</span>
                <button className="portal-btn small danger" disabled={deleting} onClick={() => void handleDelete()} type="button">Delete</button>
                <button className="portal-btn small" onClick={() => setConfirmingDelete(false)} type="button">Cancel</button>
              </>
            ) : (
              <>
                <button className="portal-btn danger" onClick={() => setConfirmingDelete(true)} type="button">Delete</button>
                <button className="portal-btn primary" onClick={() => setRenaming(true)} type="button">Rename</button>
              </>
            )}
          </span>
        ) : null}
      </div>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <SharingSettings folder={folder} onChanged={reload} />

      <FolderFilesSection folder={folder} onChanged={reload} />
    </div>
  );
}

function SharingSettings({ folder, onChanged }: { folder: FileFolder; onChanged: () => Promise<void> }) {
  const [shareExternally, setShareExternally] = useState(folder.shareExternally);
  const [shareToken, setShareToken] = useState(folder.shareToken);
  const [shareTitle, setShareTitle] = useState(folder.shareTitle);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const { busy, error, setError, submit } = useSubmit(onChanged);

  useEffect(() => {
    setShareExternally(folder.shareExternally);
    setShareToken(folder.shareToken);
    setShareTitle(folder.shareTitle);
  }, [folder.shareExternally, folder.shareToken, folder.shareTitle]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = `${origin}/files/${shareToken}`;

  function save() {
    if (shareExternally && !folder.hasSharePassword && !password.trim()) {
      return setError("Set a password before sharing this folder externally.");
    }
    if (!shareToken.trim()) return setError("Give this folder's link a few letters or numbers.");
    void submit(async () => {
      await api("PATCH", `/api/portal/files/${folder.id}/sharing`, { shareExternally, password, shareToken, shareTitle });
      setPassword("");
    });
  }

  return (
    <section className="portal-panel">
      <div className="portal-panel-head"><h2>Sharing</h2></div>
      <div className="portal-panel-body">
        <label className="portal-check">
          <input checked={shareExternally} onChange={(e) => setShareExternally(e.target.checked)} type="checkbox" />
          Share this folder externally
        </label>
        {shareExternally ? (
          <>
            <label className="portal-field">
              Custom link
              <div className="portal-inline">
                <span className="portal-muted mono">{origin}/files/</span>
                <input onChange={(e) => setShareToken(e.target.value)} value={shareToken} />
              </div>
            </label>
            <label className="portal-field">
              Page title
              <input onChange={(e) => setShareTitle(e.target.value)} placeholder={folder.name} value={shareTitle} />
            </label>
            <label className="portal-field">
              {folder.hasSharePassword ? "New password (leave blank to keep the current one)" : "Password"}
              <input autoComplete="off" onChange={(e) => setPassword(e.target.value)} type="text" value={password} />
            </label>
            <label className="portal-field">
              Share link
              <div className="portal-inline">
                <input className="portal-mono" readOnly value={shareUrl} />
                <button
                  className="portal-btn small"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                  type="button"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </label>
            <p className="portal-hint">Anyone with this link and the password can view and download these files.</p>
          </>
        ) : null}
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
        <span className="portal-row-actions">
          <button className="portal-btn primary" disabled={busy} onClick={save} type="button">Save sharing settings</button>
        </span>
      </div>
    </section>
  );
}

function FolderFilesSection({ folder, onChanged }: { folder: FileFolder; onChanged: () => Promise<void> }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/portal/files/${folder.id}/files`, { method: "POST", body: formData });
        const data = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed");
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(file: FolderFile) {
    setRemovingId(file.id);
    setError("");
    try {
      await api("DELETE", `/api/portal/files/${folder.id}/files/${file.id}`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that file.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="portal-panel">
      <div className="portal-panel-head"><h2>Files</h2></div>
      <div className="portal-panel-body">
        <label
          className={`portal-dropzone${dragOver ? " drag-over" : ""}`}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
          }}
        >
          <input
            multiple
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
            type="file"
          />
          <span>{uploading ? "Uploading…" : "Drag files here, or click to browse"}</span>
        </label>
        {error ? <p className="portal-msg err" role="alert">{error}</p> : null}
        {folder.files.length ? (
          <ul className="portal-file-list">
            {folder.files.map((f) => (
              <li key={f.id}>
                <a href={f.url} rel="noreferrer" target="_blank">{f.fileName}</a>
                <span className="portal-muted small">{fmtFileSize(f.size)}</span>
                <button
                  aria-label={`Remove ${f.fileName}`}
                  disabled={removingId === f.id}
                  onClick={() => void removeFile(f)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="portal-muted small">No files yet.</p>
        )}
      </div>
    </section>
  );
}
