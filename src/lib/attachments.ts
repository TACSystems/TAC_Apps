import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { dataDir } from "@/lib/db";
import { sealFile } from "@/lib/security-state";

export type OwnerType = "firearm" | "accessory";
export type AttachmentKind = "receipt" | "photo" | "bill_of_sale" | "document";

export type Attachment = {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  kind: AttachmentKind;
  file_path: string;
  original_name: string | null;
  uploaded_at: string;
};

export const ALLOWED_ATTACHMENT = /\.(jpe?g|png|webp|gif|pdf)$/i;
export const IMAGE_ATTACHMENT = /\.(jpe?g|png|webp|gif)$/i;

function filesRoot() {
  return path.join(dataDir(), "receipts");
}

export function listAttachments(
  db: Database.Database,
  ownerType: OwnerType,
  ownerId: string,
  kinds?: AttachmentKind[]
): Attachment[] {
  const rows = db
    .prepare(`select * from attachments where owner_type = ? and owner_id = ? order by uploaded_at desc`)
    .all(ownerType, ownerId) as Attachment[];
  return kinds ? rows.filter((r) => kinds.includes(r.kind)) : rows;
}

export function firstPhotos(db: Database.Database, ownerType: OwnerType): Map<string, string> {
  const rows = db
    .prepare(
      `select owner_id, file_path from attachments where owner_type = ? and kind = 'photo' order by uploaded_at asc`
    )
    .all(ownerType) as { owner_id: string; file_path: string }[];
  const out = new Map<string, string>();
  for (const r of rows) if (!out.has(r.owner_id)) out.set(r.owner_id, r.file_path);
  return out;
}

export async function saveAttachment(
  db: Database.Database,
  ownerType: OwnerType,
  ownerId: string,
  kind: AttachmentKind,
  file: File
) {
  if (!ALLOWED_ATTACHMENT.test(file.name)) return null;
  const dir = path.join(filesRoot(), ownerId);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80) || "file";
  const storedName = `${randomUUID()}-${safeName}`;
  fs.writeFileSync(path.join(dir, storedName), sealFile(Buffer.from(await file.arrayBuffer())));
  const id = randomUUID();
  db.prepare(
    `insert into attachments (id, owner_type, owner_id, kind, file_path, original_name) values (?, ?, ?, ?, ?, ?)`
  ).run(id, ownerType, ownerId, kind, `${ownerId}/${storedName}`, file.name);
  return id;
}

function removeFile(rel: string) {
  const base = path.resolve(filesRoot());
  const target = path.resolve(path.join(base, rel));
  if (!target.startsWith(base + path.sep)) return;
  fs.rmSync(target, { force: true });
}

export function deleteAttachment(db: Database.Database, id: string): Attachment | null {
  const row = db.prepare(`select * from attachments where id = ?`).get(id) as Attachment | undefined;
  if (!row) return null;
  db.prepare(`delete from attachments where id = ?`).run(id);
  removeFile(row.file_path);
  return row;
}

export function deleteAttachmentsFor(db: Database.Database, ownerType: OwnerType, ownerId: string) {
  const rows = listAttachments(db, ownerType, ownerId);
  db.prepare(`delete from attachments where owner_type = ? and owner_id = ?`).run(ownerType, ownerId);
  for (const r of rows) removeFile(r.file_path);
  const dir = path.join(filesRoot(), ownerId);
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {}
}

export function ownerPath(ownerType: OwnerType, ownerId: string) {
  return ownerType === "firearm" ? `/inventory/${ownerId}` : `/inventory/accessories/${ownerId}`;
}
