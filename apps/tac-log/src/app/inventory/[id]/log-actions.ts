"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/settings-shared";
import { decodePick } from "@/lib/ammo";
import { assignEntry, cleanLocation, pruneSessions } from "@/lib/sessions";

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

  if (type.toLowerCase() === "cleaning") recomputeLastCleaned(firearmId);

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

export async function logRoundsFired(firearmId: string, formData: FormData) {
  const db = getDb();
  const rounds = Math.round(Number(formData.get("rounds") || 0));
  if (!Number.isFinite(rounds) || rounds <= 0) return;
  const firearm = db.prepare(`select caliber from firearms where id = ?`).get(firearmId) as
    | { caliber: string | null }
    | undefined;
  if (!firearm) return;

  const pick = decodePick(formData.get("ammo_pick"));
  const id = randomUUID();
  db.transaction(() => {
    db.prepare(
      `insert into rounds_fired_log (id, firearm_id, date, rounds, caliber, ammo_lot, deduct_from_ammo, notes,
         range_location, ammo_type, ammo_grain, ammo_manufacturer)
       values (@id, @firearm_id, @date, @rounds, @caliber, @ammo_lot, @deduct_from_ammo, @notes,
         @range_location, @ammo_type, @ammo_grain, @ammo_manufacturer)`
    ).run({
      id,
      firearm_id: firearmId,
      date: String(formData.get("date") || todayISO()),
      rounds,
      caliber: pick?.caliber ?? s(formData, "caliber") ?? firearm.caliber,
      ammo_lot: s(formData, "ammo_lot"),
      deduct_from_ammo: formData.get("deduct_from_ammo") === "on" ? 1 : 0,
      notes: s(formData, "notes"),
      range_location: cleanLocation(formData.get("range_location")),
      ammo_type: pick?.ammo_type ?? null,
      ammo_grain: pick?.grain ?? null,
      ammo_manufacturer: pick?.manufacturer ?? null,
    });
    assignEntry(db, "rounds_fired_log", id);
    db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(rounds, firearmId);
  })();
  revalidatePath("/range-log");

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
      pruneSessions(db);
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

function recomputeLastCleaned(firearmId: string) {
  const db = getDb();
  const latest = db
    .prepare(
      `select shots_fired_at_time from maintenance_log
       where firearm_id = ? and lower(type) = 'cleaning'
       order by date desc, created_at desc limit 1`
    )
    .get(firearmId) as { shots_fired_at_time: number | null } | undefined;
  db.prepare(`update firearms set last_cleaned_at_shots = ? where id = ?`).run(
    latest ? latest.shots_fired_at_time ?? 0 : null,
    firearmId
  );
}

function touch(firearmId: string) {
  revalidatePath(`/inventory/${firearmId}`);
  revalidatePath("/");
}

export async function updateMaintenance(firearmId: string, entryId: string, formData: FormData) {
  getDb()
    .prepare(
      `update maintenance_log set date = @date, type = @type, shots_fired_at_time = @shots, notes = @notes
       where id = @id and firearm_id = @firearm_id`
    )
    .run({
      id: entryId,
      firearm_id: firearmId,
      date: String(formData.get("date")),
      type: s(formData, "type") ?? "Cleaning",
      shots: n(formData, "shots_fired_at_time"),
      notes: s(formData, "notes"),
    });
  recomputeLastCleaned(firearmId);
  touch(firearmId);
}

export async function deleteMaintenance(firearmId: string, entryId: string) {
  getDb().prepare(`delete from maintenance_log where id = ? and firearm_id = ?`).run(entryId, firearmId);
  recomputeLastCleaned(firearmId);
  touch(firearmId);
}

export async function updateMalfunction(firearmId: string, entryId: string, formData: FormData) {
  getDb()
    .prepare(
      `update malfunction_log set date = @date, round_count_at_failure = @round, malfunction_type = @type,
         cause = @cause, notes = @notes
       where id = @id and firearm_id = @firearm_id`
    )
    .run({
      id: entryId,
      firearm_id: firearmId,
      date: String(formData.get("date")),
      round: n(formData, "round_count_at_failure"),
      type: s(formData, "malfunction_type"),
      cause: s(formData, "cause"),
      notes: s(formData, "notes"),
    });
  touch(firearmId);
}

export async function deleteMalfunction(firearmId: string, entryId: string) {
  getDb().prepare(`delete from malfunction_log where id = ? and firearm_id = ?`).run(entryId, firearmId);
  touch(firearmId);
}

export async function updateZero(firearmId: string, entryId: string, formData: FormData) {
  getDb()
    .prepare(
      `update zero_records set date = @date, distance = @distance, optic = @optic,
         ammo_description = @ammo_description, adjustment = @adjustment, notes = @notes
       where id = @id and firearm_id = @firearm_id`
    )
    .run({
      id: entryId,
      firearm_id: firearmId,
      date: String(formData.get("date")),
      distance: s(formData, "distance"),
      optic: s(formData, "optic"),
      ammo_description: s(formData, "ammo_description"),
      adjustment: s(formData, "adjustment"),
      notes: s(formData, "notes"),
    });
  touch(firearmId);
}

export async function deleteZero(firearmId: string, entryId: string) {
  getDb().prepare(`delete from zero_records where id = ? and firearm_id = ?`).run(entryId, firearmId);
  touch(firearmId);
}

function dispositionParams(formData: FormData) {
  return {
    date: String(formData.get("date")),
    type: s(formData, "type") ?? "Sold",
    recipient_name: s(formData, "recipient_name"),
    recipient_ffl: s(formData, "recipient_ffl"),
    recipient_address: s(formData, "recipient_address"),
    price: n(formData, "price"),
    notes: s(formData, "notes"),
  };
}

export async function recordDisposition(firearmId: string, formData: FormData) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `insert into firearm_dispositions (id, firearm_id, date, type, recipient_name, recipient_ffl, recipient_address, price, notes)
       values (@id, @firearm_id, @date, @type, @recipient_name, @recipient_ffl, @recipient_address, @price, @notes)`
    ).run({ id: randomUUID(), firearm_id: firearmId, ...dispositionParams(formData) });
    if (formData.get("mark_disposed") === "on") {
      db.prepare(`update firearms set status = 'sold' where id = ?`).run(firearmId);
    }
  })();
  touch(firearmId);
  revalidatePath("/inventory");
}

export async function updateDisposition(firearmId: string, entryId: string, formData: FormData) {
  getDb()
    .prepare(
      `update firearm_dispositions set date = @date, type = @type, recipient_name = @recipient_name,
         recipient_ffl = @recipient_ffl, recipient_address = @recipient_address, price = @price, notes = @notes
       where id = @id and firearm_id = @firearm_id`
    )
    .run({ id: entryId, firearm_id: firearmId, ...dispositionParams(formData) });
  touch(firearmId);
}

export async function deleteDisposition(firearmId: string, entryId: string) {
  getDb().prepare(`delete from firearm_dispositions where id = ? and firearm_id = ?`).run(entryId, firearmId);
  touch(firearmId);
}
