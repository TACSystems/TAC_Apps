"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function s(formData: FormData, key: string) {
  const v = formData.get(key);
  return v && v !== "" ? String(v) : null;
}

export async function createParticipant(formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into participants (id, name, email, phone, notes, status)
     values (@id, @name, @email, @phone, @notes, @status)`
  ).run({
    id: randomUUID(),
    name: String(formData.get("name")),
    email: s(formData, "email"),
    phone: s(formData, "phone"),
    notes: s(formData, "notes"),
    status: s(formData, "status") ?? "active",
  });

  revalidatePath("/participants");
  redirect("/participants");
}

export async function updateParticipant(id: string, formData: FormData) {
  const db = getDb();
  db.prepare(
    `update participants set name = @name, email = @email, phone = @phone, notes = @notes, status = @status
     where id = @id`
  ).run({
    id,
    name: String(formData.get("name")),
    email: s(formData, "email"),
    phone: s(formData, "phone"),
    notes: s(formData, "notes"),
    status: s(formData, "status") ?? "active",
  });

  revalidatePath("/participants");
  revalidatePath(`/participants/${id}`);
  redirect(`/participants/${id}`);
}

export async function deleteParticipant(id: string) {
  const db = getDb();
  db.prepare(`delete from participants where id = ?`).run(id);
  revalidatePath("/participants");
  redirect("/participants");
}
