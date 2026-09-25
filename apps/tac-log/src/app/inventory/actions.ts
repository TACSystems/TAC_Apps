"use server";

import { firearmLabel as labelOf } from "@/lib/settings-shared";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAttachmentsFor } from "@/lib/attachments";
import { todayISO } from "@/lib/settings-shared";
import { isoDate, number, text } from "@core/lib/forms";
import { flash } from "@core/lib/flash";

const s = (formData: FormData, key: string) => (/_date$/.test(key) ? isoDate(formData, key) : text(formData, key));
const n = (formData: FormData, key: string) => number(formData, key);

export async function createFirearm(formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into firearms
      (id, make_model, nickname, caliber, platform, serial_number, purchase_date, purchase_location,
       purchase_value, ffl_license_number, receipt, clean_interval_rounds, clean_interval_days, status, notes)
     values (@id, @make_model, @nickname, @caliber, @platform, @serial_number, @purchase_date, @purchase_location,
       @purchase_value, @ffl_license_number, @receipt, @clean_interval_rounds, @clean_interval_days, @status, @notes)`
  ).run({
    id: randomUUID(),
    make_model: String(formData.get("make_model")),
    nickname: s(formData, "nickname"),
    caliber: s(formData, "caliber"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    purchase_date: s(formData, "purchase_date"),
    purchase_location: s(formData, "purchase_location"),
    purchase_value: n(formData, "purchase_value"),
    ffl_license_number: s(formData, "ffl_license_number"),
    receipt: s(formData, "receipt"),
    clean_interval_rounds: n(formData, "clean_interval_rounds"),
    clean_interval_days: n(formData, "clean_interval_days"),
    status: s(formData, "status") ?? "active",
    notes: s(formData, "notes"),
  });

  await flash("Firearm added.");

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateFirearm(id: string, formData: FormData) {
  const db = getDb();
  db.prepare(
    `update firearms set
      make_model = @make_model,
      nickname = @nickname,
      caliber = @caliber,
      platform = @platform,
      serial_number = @serial_number,
      purchase_date = @purchase_date,
      purchase_location = @purchase_location,
      purchase_value = @purchase_value,
      ffl_license_number = @ffl_license_number,
      receipt = @receipt,
      clean_interval_rounds = @clean_interval_rounds,
      clean_interval_days = @clean_interval_days,
      status = @status,
      notes = @notes
     where id = @id`
  ).run({
    id,
    make_model: String(formData.get("make_model")),
    nickname: s(formData, "nickname"),
    caliber: s(formData, "caliber"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    purchase_date: s(formData, "purchase_date"),
    purchase_location: s(formData, "purchase_location"),
    purchase_value: n(formData, "purchase_value"),
    ffl_license_number: s(formData, "ffl_license_number"),
    receipt: s(formData, "receipt"),
    clean_interval_rounds: n(formData, "clean_interval_rounds"),
    clean_interval_days: n(formData, "clean_interval_days"),
    status: s(formData, "status") ?? "active",
    notes: s(formData, "notes"),
  });

  await flash("Changes saved.");

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  redirect(`/inventory/${id}`);
}

export async function deleteFirearm(id: string) {
  const db = getDb();
  const today = todayISO();
  db.transaction(() => {
    db.prepare(`update accessory_mounts set to_date = coalesce(to_date, ?) where firearm_id = ?`).run(today, id);
    db.prepare(`delete from firearms where id = ?`).run(id);
  })();
  deleteAttachmentsFor(db, "firearm", id);
  await flash("Firearm deleted.");
  revalidatePath("/inventory");
  redirect("/inventory");
}

function accessoryParams(formData: FormData) {
  return {
    firearm_id: s(formData, "firearm_id"),
    make_model: String(formData.get("make_model") ?? "").trim() || "Unnamed accessory",
    type: s(formData, "type"),
    platform: s(formData, "platform"),
    serial_number: s(formData, "serial_number"),
    acquisition_date: s(formData, "acquisition_date"),
    purchase_value: n(formData, "purchase_value"),
    purchase_location: s(formData, "purchase_location"),
    receipt: s(formData, "receipt"),
  };
}

function firearmLabel(id: string | null) {
  if (!id) return null;
  const row = getDb().prepare(`select make_model, nickname from firearms where id = ?`).get(id) as
    | { make_model: string; nickname: string | null }
    | undefined;
  return row ? labelOf(row, "both") : null;
}

export async function createAccessory(formData: FormData) {
  const db = getDb();
  const params = accessoryParams(formData);
  const id = randomUUID();
  db.transaction(() => {
    db.prepare(
      `insert into accessories
        (id, firearm_id, make_model, type, platform, serial_number, acquisition_date,
         purchase_value, purchase_location, receipt)
       values (@id, @firearm_id, @make_model, @type, @platform, @serial_number, @acquisition_date,
         @purchase_value, @purchase_location, @receipt)`
    ).run({ id, ...params });
    if (params.firearm_id) {
      db.prepare(
        `insert into accessory_mounts (id, accessory_id, firearm_id, firearm_label, from_date) values (?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        id,
        params.firearm_id,
        firearmLabel(params.firearm_id),
        params.acquisition_date ?? todayISO()
      );
    }
  })();

  await flash("Accessory added.");

  revalidatePath("/inventory/accessories");
  if (params.firearm_id) revalidatePath(`/inventory/${params.firearm_id}`);
  redirect(`/inventory/accessories/${id}`);
}

export async function updateAccessory(id: string, formData: FormData) {
  const db = getDb();
  const before = db.prepare(`select firearm_id from accessories where id = ?`).get(id) as
    | { firearm_id: string | null }
    | undefined;
  if (!before) redirect("/inventory/accessories");
  const params = accessoryParams(formData);
  const moveDate = s(formData, "move_date") ?? todayISO();
  const moveNote = s(formData, "move_note");

  db.transaction(() => {
    db.prepare(
      `update accessories set firearm_id = @firearm_id, make_model = @make_model, type = @type, platform = @platform,
         serial_number = @serial_number, acquisition_date = @acquisition_date, purchase_value = @purchase_value,
         purchase_location = @purchase_location, receipt = @receipt
       where id = @id`
    ).run({ id, ...params });

    if (before.firearm_id !== params.firearm_id) {
      db.prepare(`update accessory_mounts set to_date = ? where accessory_id = ? and to_date is null`).run(moveDate, id);
      if (params.firearm_id) {
        db.prepare(
          `insert into accessory_mounts (id, accessory_id, firearm_id, firearm_label, from_date, notes)
           values (?, ?, ?, ?, ?, ?)`
        ).run(randomUUID(), id, params.firearm_id, firearmLabel(params.firearm_id), moveDate, moveNote);
      }
    }
  })();

  await flash("Changes saved.");

  revalidatePath("/inventory/accessories");
  revalidatePath(`/inventory/accessories/${id}`);
  if (before.firearm_id) revalidatePath(`/inventory/${before.firearm_id}`);
  if (params.firearm_id) revalidatePath(`/inventory/${params.firearm_id}`);
  redirect(`/inventory/accessories/${id}?saved=1`);
}

export async function deleteMountEntry(accessoryId: string, mountId: string) {
  getDb().prepare(`delete from accessory_mounts where id = ? and accessory_id = ?`).run(mountId, accessoryId);
  await flash("History entry removed.");
  revalidatePath(`/inventory/accessories/${accessoryId}`);
}

export async function deleteAccessory(id: string) {
  const db = getDb();
  const row = db.prepare(`select firearm_id from accessories where id = ?`).get(id) as
    | { firearm_id: string | null }
    | undefined;
  db.prepare(`delete from accessories where id = ?`).run(id);
  deleteAttachmentsFor(db, "accessory", id);
  await flash("Accessory deleted.");
  revalidatePath("/inventory/accessories");
  if (row?.firearm_id) revalidatePath(`/inventory/${row.firearm_id}`);
  redirect("/inventory/accessories");
}
