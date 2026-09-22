"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function s(formData: FormData, key: string) {
  const v = formData.get(key);
  return v && v !== "" ? String(v) : null;
}

function n(formData: FormData, key: string) {
  const v = formData.get(key);
  if (!v || v === "") return null;
  const num = Number(v);
  return Number.isNaN(num) ? null : num;
}

export async function createFirearm(formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into firearms
      (id, make_model, caliber, platform, serial_number, purchase_date, purchase_location,
       purchase_value, ffl_license_number, receipt, clean_interval_rounds, status, notes)
     values (@id, @make_model, @caliber, @platform, @serial_number, @purchase_date, @purchase_location,
       @purchase_value, @ffl_license_number, @receipt, @clean_interval_rounds, @status, @notes)`
  ).run({
    id: randomUUID(),
    make_model: String(formData.get("make_model")),
    caliber: s(formData, "caliber"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    purchase_date: s(formData, "purchase_date"),
    purchase_location: s(formData, "purchase_location"),
    purchase_value: n(formData, "purchase_value"),
    ffl_license_number: s(formData, "ffl_license_number"),
    receipt: s(formData, "receipt"),
    clean_interval_rounds: n(formData, "clean_interval_rounds"),
    status: s(formData, "status") ?? "active",
    notes: s(formData, "notes"),
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateFirearm(id: string, formData: FormData) {
  const db = getDb();
  db.prepare(
    `update firearms set
      make_model = @make_model,
      caliber = @caliber,
      platform = @platform,
      serial_number = @serial_number,
      purchase_date = @purchase_date,
      purchase_location = @purchase_location,
      purchase_value = @purchase_value,
      ffl_license_number = @ffl_license_number,
      receipt = @receipt,
      clean_interval_rounds = @clean_interval_rounds,
      status = @status,
      notes = @notes
     where id = @id`
  ).run({
    id,
    make_model: String(formData.get("make_model")),
    caliber: s(formData, "caliber"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    purchase_date: s(formData, "purchase_date"),
    purchase_location: s(formData, "purchase_location"),
    purchase_value: n(formData, "purchase_value"),
    ffl_license_number: s(formData, "ffl_license_number"),
    receipt: s(formData, "receipt"),
    clean_interval_rounds: n(formData, "clean_interval_rounds"),
    status: s(formData, "status") ?? "active",
    notes: s(formData, "notes"),
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  redirect(`/inventory/${id}`);
}

export async function deleteFirearm(id: string) {
  const db = getDb();
  db.prepare(`delete from firearms where id = ?`).run(id);
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function createAccessory(formData: FormData) {
  const db = getDb();
  const firearmId = s(formData, "firearm_id");

  db.prepare(
    `insert into accessories
      (id, firearm_id, make_model, type, platform, serial_number, acquisition_date,
       purchase_value, purchase_location, receipt)
     values (@id, @firearm_id, @make_model, @type, @platform, @serial_number, @acquisition_date,
       @purchase_value, @purchase_location, @receipt)`
  ).run({
    id: randomUUID(),
    firearm_id: firearmId,
    make_model: String(formData.get("make_model")),
    type: s(formData, "type"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    acquisition_date: s(formData, "acquisition_date"),
    purchase_value: n(formData, "purchase_value"),
    purchase_location: s(formData, "purchase_location"),
    receipt: s(formData, "receipt"),
  });

  revalidatePath("/inventory/accessories");
  if (firearmId) revalidatePath(`/inventory/${firearmId}`);
  redirect("/inventory/accessories");
}

export async function deleteAccessory(id: string) {
  const db = getDb();
  db.prepare(`delete from accessories where id = ?`).run(id);
  revalidatePath("/inventory/accessories");
  redirect("/inventory/accessories");
}
