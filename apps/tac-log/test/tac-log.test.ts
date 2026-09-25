import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3-multiple-ciphers";
import { SCHEMA_SQL } from "@/lib/db/schema";
import { createAmmoViews, goalStatus, migrateAmmoGoals, stockLines, upsertGoal, decodePick, encodePick } from "@/lib/ammo";
import { backfillSessions, findOrCreateSession, listSessions, mergeSessions, moveEntry, pruneSessions } from "@/lib/sessions";
import { maintenanceInfo } from "@/lib/maintenance";
import { registerLabelFunction } from "@/lib/display";
import { correctFirearmCount } from "@/lib/counts";
import type { Firearm } from "@/lib/db/types";

function fresh() {
  const db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
  migrateAmmoGoals(db);
  createAmmoViews(db);
  registerLabelFunction(db);
  return db;
}

test("ammo on hand by line, unassigned rounds, corrections", () => {
  const db = fresh();
  db.exec(`insert into ammo_purchases (id, manufacturer, ammo_type, caliber, grain, quantity) values
    ('p1','Federal','FMJ','9mm',115,1000), ('p2','Blazer','FMJ','9mm',115,500), ('p3','Hornady','JHP','9mm',124,100)`);
  db.exec(`insert into range_log (id, date, caliber, rounds_fired, ammo_type, ammo_grain, ammo_manufacturer) values
    ('r1','2026-09-01','9mm',50,'FMJ',115,'Federal'), ('r2','2026-09-01','9mm',30,null,null,null)`);
  db.exec(`insert into rounds_fired_log (id, date, rounds, caliber, deduct_from_ammo, ammo_type, ammo_grain, ammo_manufacturer) values
    ('x1','2026-09-02',20,'9mm',1,'JHP',124,'Hornady'), ('x2','2026-09-02',999,'9mm',0,'FMJ',115,'Blazer')`);
  db.exec(`insert into count_adjustments (id, kind, caliber, ammo_type, grain, manufacturer, date, delta) values ('a1','ammo','9mm','FMJ',115,'Blazer','2026-09-03',-10)`);
  const lines = stockLines(db);
  const get = (b: string | null) => lines.find((l) => l.manufacturer === b)!;
  assert.equal(get("Federal").on_hand, 950);
  assert.equal(get("Blazer").on_hand, 490);
  assert.equal(get("Hornady").on_hand, 80);
  assert.equal(get(null).on_hand, -30);
  const total = (db.prepare(`select on_hand from ammo_on_hand where caliber = '9mm'`).get() as { on_hand: number }).on_hand;
  assert.equal(total, 950 + 490 + 80 - 30);
});

test("goals: caliber-wide vs narrowed to type and grain", () => {
  const db = fresh();
  db.exec(`insert into ammo_purchases (id, manufacturer, ammo_type, caliber, grain, quantity) values
    ('p1','Federal','FMJ','9mm',115,600), ('p3','Hornady','JHP','9mm',124,100)`);
  db.exec(`insert into range_log (id, date, caliber, rounds_fired) values ('r2','2026-09-01','9mm',40)`);
  upsertGoal(db, { caliber: "9mm", ammo_type: null, grain: null, goal: 1000 });
  upsertGoal(db, { caliber: "9mm", ammo_type: "JHP", grain: 124, goal: 400 });
  upsertGoal(db, { caliber: "9mm", ammo_type: "JHP", grain: 124, goal: 200 });
  const g = goalStatus(db, 50);
  assert.equal(g.length, 2);
  const all = g.find((x) => x.ammo_type == null)!;
  const jhp = g.find((x) => x.ammo_type === "JHP")!;
  assert.equal(all.on_hand, 660);
  assert.equal(all.low, false);
  assert.equal(jhp.goal, 200);
  assert.equal(jhp.on_hand, 100);
  assert.equal(jhp.low, false);
  assert.equal(Math.round(jhp.pct * 100), 50);
});

test("ammo pick encoding round trip", () => {
  const p = { caliber: "9mm", ammo_type: "FMJ", grain: 115, manufacturer: "Federal" };
  assert.deepEqual(decodePick(encodePick(p)), p);
  assert.equal(decodePick("not json"), null);
  assert.equal(decodePick(JSON.stringify(["", null, null, null])), null);
});

test("sessions group by date and location, move, merge, prune", () => {
  const db = fresh();
  const a = findOrCreateSession(db, "2026-09-01", "Oak Ridge");
  assert.equal(findOrCreateSession(db, "2026-09-01", " oak ridge "), a);
  const blank1 = findOrCreateSession(db, "2026-09-01", null);
  assert.equal(findOrCreateSession(db, "2026-09-01", ""), blank1);
  assert.notEqual(blank1, a);
  const b = findOrCreateSession(db, "2026-09-05", "North");
  db.prepare(`insert into range_log (id, date, range_location, session_id, rounds_fired) values ('r1','2026-09-01','Oak Ridge',?,50)`).run(a);
  db.prepare(`insert into rounds_fired_log (id, date, range_location, session_id, rounds) values ('x1','2026-09-05','North',?,20)`).run(b);
  pruneSessions(db);
  assert.equal((db.prepare(`select count(*) n from range_sessions`).get() as { n: number }).n, 2);
  moveEntry(db, "rounds_fired_log", "x1", a);
  const x1 = db.prepare(`select * from rounds_fired_log where id = 'x1'`).get() as { session_id: string; date: string; range_location: string };
  assert.equal(x1.session_id, a);
  assert.equal(x1.date, "2026-09-01");
  assert.equal(x1.range_location, "Oak Ridge");
  assert.equal(db.prepare(`select 1 from range_sessions where id = ?`).get(b), undefined);
  moveEntry(db, "rounds_fired_log", "x1", "new");
  const split = (db.prepare(`select session_id from rounds_fired_log where id = 'x1'`).get() as { session_id: string }).session_id;
  assert.notEqual(split, a);
  mergeSessions(db, split, a);
  const s = listSessions(db);
  assert.equal(s.length, 1);
  assert.equal(s[0].rounds, 70);
});

test("backfill groups old entries and reads Range Day notes", () => {
  const db = fresh();
  db.exec(`insert into range_log (id, date, range_location, rounds_fired, created_at) values ('r1','2026-09-01','Oak Ridge',50,'2026-09-01 10:00:00')`);
  db.exec(`insert into rounds_fired_log (id, date, rounds, notes, created_at) values
    ('x1','2026-09-01',200,'Range Day at Oak Ridge · windy','2026-09-01 11:00:00'),
    ('x2','2026-08-01',10,'Range Day','2026-08-01 11:00:00')`);
  assert.equal(backfillSessions(db), 3);
  const x1 = db.prepare(`select * from rounds_fired_log where id = 'x1'`).get() as { session_id: string; range_location: string; notes: string };
  const r1 = db.prepare(`select session_id from range_log where id = 'r1'`).get() as { session_id: string };
  assert.equal(x1.session_id, r1.session_id);
  assert.equal(x1.range_location, "Oak Ridge");
  assert.equal(x1.notes, "windy");
  const nums = db.prepare(`select number, date from range_sessions order by number`).all() as { number: number; date: string }[];
  assert.deepEqual(nums.map((n) => n.date), ["2026-08-01", "2026-09-01"]);
  assert.equal(backfillSessions(db), 0);
});

test("cleaning due math", () => {
  const f = { shots_fired: 900, last_cleaned_at_shots: 500, clean_interval_rounds: 500, clean_interval_days: null, purchase_date: null, date_of_entry: "2026-01-01 00:00:00" } as unknown as Firearm;
  assert.equal(maintenanceInfo(f, "2026-09-01", null, 0.8).status, "soon");
  assert.equal(maintenanceInfo({ ...f, shots_fired: 1000 }, "2026-09-01", null, 0.8).status, "due");
  assert.equal(maintenanceInfo({ ...f, shots_fired: 600 }, "2026-09-01", null, 0.8).status, "ok");
  const byDays = { ...f, clean_interval_rounds: null, clean_interval_days: 30 } as Firearm;
  assert.equal(maintenanceInfo(byDays, "2026-09-01", null, 0.8, new Date("2026-10-05T12:00:00")).status, "due");
  assert.equal(maintenanceInfo({ ...f, clean_interval_rounds: null } as Firearm, null, null).status, "unset");
});

test("count correction leaves rounds since cleaning alone", () => {
  const db = fresh();
  db.exec(`insert into firearms (id, make_model, status, date_of_entry, shots_fired, last_cleaned_at_shots) values
    ('never', 'A', 'active', '2026-01-01', 700, null), ('cleaned', 'B', 'active', '2026-01-01', 900, 500)`);
  const since = (id: string) => {
    const r = db.prepare(`select shots_fired, last_cleaned_at_shots from firearms where id = ?`).get(id) as { shots_fired: number; last_cleaned_at_shots: number | null };
    return r.shots_fired - (r.last_cleaned_at_shots ?? 0);
  };
  correctFirearmCount(db, "never", 1500, "bought used");
  correctFirearmCount(db, "cleaned", 1700, null);
  assert.equal(since("never"), 700);
  assert.equal(since("cleaned"), 400);
});

test("upgrading a 0.7.1 database keeps totals and forms sessions", async () => {
  const src = path.resolve(process.cwd(), "test/fixtures/db-0.7.1");
  const fixture = fs.existsSync(src) ? src : process.env.TAC_MIGRATION_FIXTURE;
  if (!fixture || !fs.existsSync(fixture)) return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taclog-mig-"));
  for (const f of fs.readdirSync(fixture)) fs.cpSync(path.join(fixture, f), path.join(dir, f), { recursive: true });
  process.env.FIREARMS_DB_DIR = dir;
  const { getDb, closeDb, MIGRATIONS } = await import("@/lib/db");
  const db = getDb();
  const done = (db.prepare(`select id from schema_migrations order by id`).all() as { id: number }[]).map((r) => r.id);
  assert.deepEqual(done, MIGRATIONS.map((m) => m.id));
  assert.equal((db.prepare(`select on_hand from ammo_on_hand where caliber = '9mm'`).get() as { on_hand: number }).on_hand, 1230);
  assert.equal((db.prepare(`select count(*) n from range_sessions`).get() as { n: number }).n, 3);
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});
