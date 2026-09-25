"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { deleteAttachmentsFor } from "@/lib/attachments";
import { isoDate, text } from "@core/lib/forms";

const s = (fd: FormData, k: string) => (/_date$/.test(k) ? isoDate(fd, k) : text(fd, k));

function values(fd: FormData) {
  return {
    doc_type: s(fd, "doc_type") ?? "Other",
    title: s(fd, "title") ?? s(fd, "doc_type") ?? "Document",
    issuer: s(fd, "issuer"),
    number: s(fd, "number"),
    holder: s(fd, "holder"),
    firearm_id: s(fd, "firearm_id"),
    status: s(fd, "status"),
    issued_date: s(fd, "issued_date"),
    expires_date: s(fd, "expires_date"),
    notes: s(fd, "notes"),
  };
}

export async function createDocument(fd: FormData) {
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into documents (id, doc_type, title, issuer, number, holder, firearm_id, status, issued_date, expires_date, notes)
       values (@id, @doc_type, @title, @issuer, @number, @holder, @firearm_id, @status, @issued_date, @expires_date, @notes)`
    )
    .run({ id, ...values(fd) });
  revalidatePath("/", "layout");
  redirect(`/documents/${id}`);
}

export async function updateDocument(id: string, fd: FormData) {
  getDb()
    .prepare(
      `update documents set doc_type=@doc_type, title=@title, issuer=@issuer, number=@number, holder=@holder,
         firearm_id=@firearm_id, status=@status, issued_date=@issued_date, expires_date=@expires_date, notes=@notes
       where id=@id`
    )
    .run({ id, ...values(fd) });
  revalidatePath("/", "layout");
  redirect(`/documents/${id}?saved=1`);
}

export async function deleteDocument(id: string) {
  const db = getDb();
  deleteAttachmentsFor(db, "document", id);
  db.prepare(`delete from documents where id = ?`).run(id);
  revalidatePath("/", "layout");
  redirect("/documents");
}
