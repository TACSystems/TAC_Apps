import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { dataDir } from "@/lib/db";
import { todayISO } from "@/lib/settings-shared";

export type CountAdjustment = {
  id: string;
  kind: "firearm" | "ammo";
  firearm_id: string | null;
  caliber: string | null;
  ammo_type: string | null;
  grain: number | null;
  manufacturer: string | null;
  date: string;
  delta: number;
  set_to: number | null;
  note: string | null;
  created_at: string;
};

export type FirearmCounter = {
  id: string;
  firearm_id: string;
  name: string;
  start_date: string;
  start_shots: number;
  interval_rounds: number | null;
  notes: string | null;
};

function shiftFirearm(db: Database.Database, firearmId: string, delta: number) {
  db.prepare(
    `update firearms set shots_fired = max(0, shots_fired + @d),
       last_cleaned_at_shots = case when last_cleaned_at_shots is null then null else max(0, last_cleaned_at_shots + @d) end
     where id = @id`
  ).run({ d: delta, id: firearmId });
  db.prepare(`update firearm_counters set start_shots = max(0, start_shots + @d) where firearm_id = @id`).run({ d: delta, id: firearmId });
}

export function correctFirearmCount(db: Database.Database, firearmId: string, target: number, note: string | null, date = todayISO()) {
  const row = db.prepare(`select shots_fired, last_cleaned_at_shots from firearms where id = ?`).get(firearmId) as
    | { shots_fired: number; last_cleaned_at_shots: number | null }
    | undefined;
  if (!row) throw new Error("Firearm not found.");
  const setTo = Math.max(0, Math.round(target));
  const delta = setTo - row.shots_fired;
  if (delta === 0) return null;
  const id = randomUUID();
  db.transaction(() => {
    if (row.last_cleaned_at_shots == null) {
      db.prepare(`update firearms set last_cleaned_at_shots = 0 where id = ?`).run(firearmId);
    }
    db.prepare(
      `insert into count_adjustments (id, kind, firearm_id, date, delta, set_to, note) values (?, 'firearm', ?, ?, ?, ?, ?)`
    ).run(id, firearmId, date, delta, setTo, note);
    shiftFirearm(db, firearmId, delta);
  })();
  return id;
}

export type AmmoLineKey = { caliber: string; ammo_type: string | null; grain: number | null; manufacturer: string | null };

export function correctAmmoLine(db: Database.Database, key: AmmoLineKey, target: number, note: string | null, date = todayISO()) {
  const row = db
    .prepare(
      `select on_hand from ammo_stock where caliber = ? and ammo_type is ? and grain is ? and manufacturer is ?`
    )
    .get(key.caliber, key.ammo_type, key.grain, key.manufacturer) as { on_hand: number } | undefined;
  const setTo = Math.round(target);
  const delta = setTo - (row?.on_hand ?? 0);
  if (delta === 0) return null;
  const id = randomUUID();
  db.prepare(
    `insert into count_adjustments (id, kind, caliber, ammo_type, grain, manufacturer, date, delta, set_to, note)
     values (?, 'ammo', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, key.caliber, key.ammo_type, key.grain, key.manufacturer, date, delta, setTo, note);
  return id;
}

export function correctAmmoCount(db: Database.Database, caliber: string, target: number, note: string | null, date = todayISO()) {
  const setTo = Math.round(target);
  const lines = db.prepare(`select * from ammo_stock where caliber = ?`).all(caliber) as (AmmoLineKey & { on_hand: number })[];
  const current = lines.reduce((s, l) => s + l.on_hand, 0);
  if (setTo === current) return null;
  let first: string | null = null;
  db.transaction(() => {
    if (setTo === 0) {
      for (const l of lines) {
        if (l.on_hand === 0) continue;
        const id = correctAmmoLine(db, l, 0, note, date);
        first = first ?? id;
      }
      return;
    }
    const id = randomUUID();
    db.prepare(
      `insert into count_adjustments (id, kind, caliber, date, delta, set_to, note) values (?, 'ammo', ?, ?, ?, ?, ?)`
    ).run(id, caliber, date, setTo - current, setTo, note);
    first = id;
  })();
  return first;
}

export function deleteAdjustment(db: Database.Database, id: string) {
  const adj = db.prepare(`select * from count_adjustments where id = ?`).get(id) as CountAdjustment | undefined;
  if (!adj) return null;
  db.transaction(() => {
    if (adj.kind === "firearm" && adj.firearm_id) shiftFirearm(db, adj.firearm_id, -adj.delta);
    db.prepare(`delete from count_adjustments where id = ?`).run(id);
  })();
  return adj;
}

export function firearmAdjustments(db: Database.Database, firearmId: string) {
  return db
    .prepare(`select * from count_adjustments where kind = 'firearm' and firearm_id = ? order by date desc, created_at desc`)
    .all(firearmId) as CountAdjustment[];
}

export function ammoAdjustments(db: Database.Database) {
  return db
    .prepare(`select * from count_adjustments where kind = 'ammo' order by date desc, created_at desc`)
    .all() as CountAdjustment[];
}

export function listCounters(db: Database.Database, firearmId: string) {
  return db
    .prepare(`select * from firearm_counters where firearm_id = ? order by created_at`)
    .all(firearmId) as FirearmCounter[];
}

export function addCounter(
  db: Database.Database,
  firearmId: string,
  input: { name: string; startDate: string; roundsSince: number; interval: number | null; notes: string | null }
) {
  const f = db.prepare(`select shots_fired from firearms where id = ?`).get(firearmId) as { shots_fired: number } | undefined;
  if (!f) throw new Error("Firearm not found.");
  const since = Math.max(0, Math.round(input.roundsSince || 0));
  db.prepare(
    `insert into firearm_counters (id, firearm_id, name, start_date, start_shots, interval_rounds, notes)
     values (?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), firearmId, input.name, input.startDate, f.shots_fired - since, input.interval, input.notes);
}

export function resetCounter(db: Database.Database, counterId: string, date = todayISO(), note: string | null = null) {
  const c = db.prepare(`select * from firearm_counters where id = ?`).get(counterId) as FirearmCounter | undefined;
  if (!c) return null;
  const f = db.prepare(`select shots_fired from firearms where id = ?`).get(c.firearm_id) as { shots_fired: number };
  db.transaction(() => {
    db.prepare(
      `insert into maintenance_log (id, firearm_id, date, shots_fired_at_time, type, notes) values (?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      c.firearm_id,
      date,
      f.shots_fired,
      `Replaced: ${c.name}`,
      [`${f.shots_fired - c.start_shots} rounds on the old one`, note].filter(Boolean).join(" · ")
    );
    db.prepare(`update firearm_counters set start_shots = ?, start_date = ? where id = ?`).run(f.shots_fired, date, counterId);
  })();
  return c;
}

export function deleteCounter(db: Database.Database, counterId: string) {
  db.prepare(`delete from firearm_counters where id = ?`).run(counterId);
}

export function safetyCopy(db: Database.Database, label: string) {
  const dir = path.join(dataDir(), "pre-reset");
  fs.mkdirSync(dir, { recursive: true });
  db.pragma("wal_checkpoint(TRUNCATE)");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `firearms-before-${label}-${stamp}.db`);
  fs.copyFileSync(path.join(dataDir(), "firearms.db"), file);
  const copies = fs.readdirSync(dir).filter((f) => f.endsWith(".db")).sort();
  for (const f of copies.slice(0, Math.max(0, copies.length - 5))) fs.rmSync(path.join(dir, f), { force: true });
  return file;
}
