import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./auth";
import { db } from "./db";
import { PortalError } from "./http";
import type { FileFolder, FolderFile } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

function toFile(r: Row): FolderFile {
  return {
    id: num(r.id),
    fileName: str(r.file_name),
    url: str(r.url),
    contentType: str(r.content_type),
    size: num(r.size),
    uploadedBy: str(r.uploaded_by),
    createdAt: iso(r.created_at) || "",
  };
}

function toFolder(r: Row, files: FolderFile[]): FileFolder {
  return {
    id: num(r.id),
    name: str(r.name),
    shareToken: str(r.share_token),
    shareExternally: Boolean(r.share_externally),
    hasSharePassword: Boolean(str(r.share_password_hash)),
    createdBy: str(r.created_by),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
    files,
  };
}

function newShareToken() {
  return randomBytes(18).toString("base64url");
}

export async function listFolders(): Promise<FileFolder[]> {
  const sql = await db();
  const [folders, files] = await Promise.all([
    sql`select * from file_folders order by name asc`,
    sql`select * from folder_files order by created_at desc`,
  ]);
  const byFolder = new Map<number, FolderFile[]>();
  for (const r of files) {
    const id = num(r.folder_id);
    byFolder.set(id, [...(byFolder.get(id) || []), toFile(r)]);
  }
  return folders.map((r) => toFolder(r, byFolder.get(num(r.id)) || []));
}

export async function getFolder(id: number): Promise<FileFolder | null> {
  const sql = await db();
  const [[row], files] = await Promise.all([
    sql`select * from file_folders where id = ${id}`,
    sql`select * from folder_files where folder_id = ${id} order by created_at desc`,
  ]);
  if (!row) return null;
  return toFolder(row, files.map(toFile));
}

export async function createFolder(name: string, createdBy: string): Promise<number> {
  if (!name.trim()) throw new PortalError("Give the folder a name.");
  const sql = await db();
  const [row] = await sql`
    insert into file_folders (name, share_token, created_by)
    values (${name}, ${newShareToken()}, ${createdBy})
    returning id`;
  return Number(row.id);
}

export async function renameFolder(id: number, name: string) {
  if (!name.trim()) throw new PortalError("Give the folder a name.");
  const sql = await db();
  const rows = await sql`update file_folders set name = ${name}, updated_at = now() where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That folder no longer exists.", 404);
}

export async function deleteFolder(id: number) {
  const sql = await db();
  await sql`delete from file_folders where id = ${id}`;
}

export type FolderSharingInput = {
  shareExternally: boolean;
  /** Leave blank to keep the current password when one is already set. */
  password: string;
};

export async function setFolderSharing(id: number, input: FolderSharingInput) {
  const sql = await db();
  const [existing] = await sql`select share_password_hash from file_folders where id = ${id}`;
  if (!existing) throw new PortalError("That folder no longer exists.", 404);
  const hasPassword = Boolean(str(existing.share_password_hash));
  if (input.shareExternally && !input.password.trim() && !hasPassword) {
    throw new PortalError("Set a password before sharing this folder externally.");
  }
  const passwordHash = input.password.trim() ? await hashPassword(input.password.trim()) : null;
  await sql`
    update file_folders set
      share_externally = ${input.shareExternally},
      share_password_hash = coalesce(${passwordHash}, share_password_hash),
      updated_at = now()
    where id = ${id}`;
}

export type FolderFileInput = {
  fileName: string;
  url: string;
  contentType: string;
  size: number;
};

export async function addFolderFile(folderId: number, input: FolderFileInput, uploadedBy: string): Promise<FolderFile> {
  const sql = await db();
  const rows = await sql`select id from file_folders where id = ${folderId}`;
  if (!rows.length) throw new PortalError("That folder no longer exists.", 404);
  const [row] = await sql`
    insert into folder_files (folder_id, file_name, url, content_type, size, uploaded_by)
    values (${folderId}, ${input.fileName}, ${input.url}, ${input.contentType}, ${input.size}, ${uploadedBy})
    returning *`;
  await sql`update file_folders set updated_at = now() where id = ${folderId}`;
  return toFile(row);
}

export async function deleteFolderFile(folderId: number, fileId: number) {
  const sql = await db();
  await sql`delete from folder_files where id = ${fileId} and folder_id = ${folderId}`;
}

/** For the public share page: checks the password and, if it matches, returns the folder's files. */
export async function unlockSharedFolder(token: string, password: string): Promise<FileFolder | null> {
  if (!token || !password) return null;
  const sql = await db();
  const [row] = await sql`select * from file_folders where share_token = ${token}`;
  if (!row || !row.share_externally || !str(row.share_password_hash)) return null;
  if (!(await verifyPassword(password, str(row.share_password_hash)))) return null;
  const files = await sql`select * from folder_files where folder_id = ${row.id} order by created_at desc`;
  return toFolder(row, files.map(toFile));
}
