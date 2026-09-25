"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { text, isoDate } from "@core/lib/forms";
import { updateSettings } from "@/lib/settings";

export async function saveProfile(formData: FormData) {
  const db = getDb();
  const name = text(formData, "name", 120) ?? "";
  db.prepare(
    `insert into instructor_profile (id, name, title, email, phone, notes, updated_at)
     values ('me', @name, @title, @email, @phone, @notes, datetime('now'))
     on conflict(id) do update set name = @name, title = @title, email = @email,
       phone = @phone, notes = @notes, updated_at = datetime('now')`
  ).run({
    name,
    title: text(formData, "title", 120),
    email: text(formData, "email", 160),
    phone: text(formData, "phone", 40),
    notes: text(formData, "notes", 2000),
  });
  updateSettings(db, { instructorName: name });
  await flash("Instructor profile saved.");
  revalidatePath("/instructor");
}

export async function addCert(formData: FormData) {
  const db = getDb();
  const name = text(formData, "name", 120);
  if (!name) {
    await flash("A certification name is required.", "error");
    return;
  }
  const next = db.prepare(`select coalesce(max(sort_order), -1) + 1 as n from instructor_certs`).get() as { n: number };
  db.prepare(
    `insert into instructor_certs (id, name, issuer, number, issued_date, expires_date, notes, sort_order)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    name,
    text(formData, "issuer", 120),
    text(formData, "number", 60),
    isoDate(formData, "issued_date"),
    isoDate(formData, "expires_date"),
    text(formData, "cert_notes", 500),
    next.n
  );
  await flash("Certification added.");
  revalidatePath("/instructor");
}

export async function removeCert(formData: FormData) {
  getDb().prepare(`delete from instructor_certs where id = ?`).run(String(formData.get("id") ?? ""));
  await flash("Certification removed.");
  revalidatePath("/instructor");
}
