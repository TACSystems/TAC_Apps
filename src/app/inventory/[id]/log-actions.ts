"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

function dataDir() {
  return process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
}

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

export async function logMaintenance(firearmId: string, formData: FormData) {
  const db = getDb();
  const firearm = db.prepare(`select shots_fired from firearms where id = ?`).get(firearmId) as
    | { shots_fired: number }
    | undefined;
  const type = s(formData, "type") ?? "Cleaning";

  db.prepare(
    `insert into maintenance_log (id, firearm_id, date, shots_fired_at_time, type, notes)
     values (@id, @firearm_id, @date, @shots_fired_at_time, @type, @notes)`
  ).run({
    id: randomUUID(),
    firearm_id: firearmId,
    date: String(formData.get("date")),
    shots_fired_at_time: firearm?.shots_fired ?? null,
    type,
    notes: s(formData, "notes"),
  });

  if (type.toLowerCase() === "cleaning") {
    db.prepare(`update firearms set last_cleaned_at_shots = ? where id = ?`).run(
      firearm?.shots_fired ?? 0,
      firearmId
    );
  }

  revalidatePath(`/inventory/${firearmId}`);
  revalidatePath("/");
}

export async function logMalfunction(firearmId: string, formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into malfunction_log (id, firearm_id, date, round_count_at_failure, malfunction_type, cause, notes)
     values (@id, @firearm_id, @date, @round_count_at_failure, @malfunction_type, @cause, @notes)`
  ).run({
    id: randomUUID(),
    firearm_id: firearmId,
    date: String(formData.get("date")),
    round_count_at_failure: n(formData, "round_count_at_failure"),
    malfunction_type: s(formData, "malfunction_type"),
    cause: s(formData, "cause"),
    notes: s(formData, "notes"),
  });

  revalidatePath(`/inventory/${firearmId}`);
}

export async function logZeroRecord(firearmId: string, formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into zero_records (id, firearm_id, date, distance, ammo_description, optic, adjustment, notes)
     values (@id, @firearm_id, @date, @distance, @ammo_description, @optic, @adjustment, @notes)`
  ).run({
    id: randomUUID(),
    firearm_id: firearmId,
    date: String(formData.get("date")),
    distance: s(formData, "distance"),
    ammo_description: s(formData, "ammo_description"),
    optic: s(formData, "optic"),
    adjustment: s(formData, "adjustment"),
    notes: s(formData, "notes"),
  });

  revalidatePath(`/inventory/${firearmId}`);
}

export async function uploadReceiptImage(firearmId: string, formData: FormData) {
  const file = formData.get("receipt_image");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }
  if (!/\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name)) {
    return;
  }

  const dir = path.join(dataDir(), "receipts", firearmId);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80) || "receipt";
  const storedName = `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, storedName), buffer);

  const db = getDb();
  db.prepare(
    `insert into receipt_images (id, firearm_id, file_path, original_name)
     values (@id, @firearm_id, @file_path, @original_name)`
  ).run({
    id: randomUUID(),
    firearm_id: firearmId,
    file_path: `${firearmId}/${storedName}`,
    original_name: file.name,
  });

  revalidatePath(`/inventory/${firearmId}`);
}

export async function deleteReceiptImage(firearmId: string, imageId: string, filePath: string) {
  const db = getDb();
  db.prepare(`delete from receipt_images where id = ?`).run(imageId);
  try {
    fs.unlinkSync(path.join(dataDir(), "receipts", filePath));
  } catch {
    // file already gone — nothing to clean up
  }
  revalidatePath(`/inventory/${firearmId}`);
}

export async function logRoundsFired(firearmId: string, formData: FormData) {
  const db = getDb();
  const rounds = Math.round(Number(formData.get("rounds") || 0));
  if (!Number.isFinite(rounds) || rounds <= 0) return;
  const firearm = db.prepare(`select caliber from firearms where id = ?`).get(firearmId) as
    | { caliber: string | null }
    | undefined;
  if (!firearm) return;

  db.transaction(() => {
    db.prepare(
      `insert into rounds_fired_log (id, firearm_id, date, rounds, caliber, ammo_lot, deduct_from_ammo, notes)
       values (@id, @firearm_id, @date, @rounds, @caliber, @ammo_lot, @deduct_from_ammo, @notes)`
    ).run({
      id: randomUUID(),
      firearm_id: firearmId,
      date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
      rounds,
      caliber: s(formData, "caliber") ?? firearm.caliber,
      ammo_lot: s(formData, "ammo_lot"),
      deduct_from_ammo: formData.get("deduct_from_ammo") === "on" ? 1 : 0,
      notes: s(formData, "notes"),
    });
    db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(rounds, firearmId);
  })();

  revalidatePath(`/inventory/${firearmId}`);
  revalidatePath("/");
  revalidatePath("/ammo");
}

export async function deleteRoundsFired(firearmId: string, entryId: string) {
  const db = getDb();
  const entry = db.prepare(`select rounds from rounds_fired_log where id = ?`).get(entryId) as
    | { rounds: number }
    | undefined;
  if (entry) {
    db.transaction(() => {
      db.prepare(`delete from rounds_fired_log where id = ?`).run(entryId);
      db.prepare(`update firearms set shots_fired = max(0, shots_fired - ?) where id = ?`).run(
        entry.rounds,
        firearmId
      );
    })();
  }
  revalidatePath(`/inventory/${firearmId}`);
  revalidatePath("/");
  revalidatePath("/ammo");
}
