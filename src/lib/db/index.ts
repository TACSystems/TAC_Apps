import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { applyCofPatch, resolveTargetType, type CofPatch, type ZoneDef } from "@/lib/cof";
import { seedDropdownOptions } from "./dropdown-options";
import { SCHEMA_SQL } from "./schema";

declare global {
  var __firearmsDb: Database.Database | undefined;
}

type ColumnInfo = { name: string; notnull: number };

function columns(db: Database.Database, table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

function tableExists(db: Database.Database, table: string) {
  return Boolean(
    db.prepare(`select 1 from sqlite_master where type = 'table' and name = ?`).get(table)
  );
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string) {
  if (!columns(db, table).some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    return true;
  }
  return false;
}

function rebuildCofStringsIfNeeded(db: Database.Database) {
  const cols = columns(db, "cof_strings");
  const stringNumber = cols.find((c) => c.name === "string_number");
  if (!stringNumber || stringNumber.notnull === 0) return;

  const keep = [
    "id",
    "phase_id",
    "sort_order",
    "row_type",
    "string_number",
    "option_label",
    "distance",
    "weapon",
    "rounds",
    "time_limit",
    "position",
    "action",
    "extra_json",
  ].filter((c) => cols.some((x) => x.name === c));

  db.transaction(() => {
    db.exec(`
      create table cof_strings_new (
        id text primary key,
        phase_id text not null references cof_phases(id) on delete cascade,
        sort_order integer not null default 0,
        row_type text not null default 'string',
        string_number real,
        option_label text,
        distance text,
        weapon text,
        rounds text,
        time_limit text,
        position text,
        action text,
        extra_json text
      );
      insert into cof_strings_new (${keep.join(", ")}) select ${keep.join(", ")} from cof_strings;
      drop table cof_strings;
      alter table cof_strings_new rename to cof_strings;
    `);
  })();
}

function migrateScoringZonesToTargetTypes(db: Database.Database) {
  if (!tableExists(db, "cof_scoring_zones")) return;
  const courses = db
    .prepare(`select id, code, target_type from courses_of_fire where target_type_id is null`)
    .all() as { id: string; code: string; target_type: string | null }[];
  const zoneStmt = db.prepare(
    `select zone_label, value from cof_scoring_zones where cof_id = ? order by value desc`
  );
  db.transaction(() => {
    for (const c of courses) {
      const zones = zoneStmt.all(c.id) as ZoneDef[];
      const targetId = resolveTargetType(db, c.target_type, zones, c.code);
      if (targetId) {
        db.prepare(
          `update courses_of_fire set target_type_id = ?,
             target_type = (select name from target_types where id = ?) where id = ?`
        ).run(targetId, targetId, c.id);
      }
    }
    db.exec(`drop table cof_scoring_zones`);
  })();
}

function migrateReceiptImages(db: Database.Database) {
  if (!tableExists(db, "receipt_images")) return;
  db.transaction(() => {
    db.exec(`
      insert or ignore into attachments (id, owner_type, owner_id, kind, file_path, original_name, uploaded_at)
      select id, 'firearm', firearm_id, 'receipt', file_path, original_name, uploaded_at from receipt_images;
      drop table receipt_images;
    `);
  })();
}

function seedAccessoryMounts(db: Database.Database) {
  db.exec(`
    insert into accessory_mounts (id, accessory_id, firearm_id, firearm_label, from_date)
    select lower(hex(randomblob(16))), a.id, a.firearm_id, f.make_model, a.acquisition_date
    from accessories a join firearms f on f.id = a.firearm_id
    where a.firearm_id is not null
      and not exists (select 1 from accessory_mounts m where m.accessory_id = a.id)
  `);
}

function dropGroupTables(db: Database.Database) {
  db.exec(`
    drop table if exists group_range_log_zone_counts;
    drop table if exists group_range_log;
    drop table if exists participants;
  `);
}

export function dataDir() {
  return process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
}

export function closeDb() {
  const db = global.__firearmsDb;
  if (db) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {}
    db.close();
    global.__firearmsDb = undefined;
  }
}

function initDb(): Database.Database {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, "firearms.db");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(SCHEMA_SQL);

  addColumnIfMissing(db, "firearms", "last_cleaned_at_shots", "INTEGER");
  addColumnIfMissing(db, "firearms", "clean_interval_rounds", "INTEGER");
  addColumnIfMissing(db, "firearms", "clean_interval_days", "INTEGER");
  addColumnIfMissing(db, "ammo_purchases", "lot_number", "TEXT");
  addColumnIfMissing(db, "range_log", "ammo_lot", "TEXT");
  addColumnIfMissing(db, "range_log", "passing_score_percent", "REAL");
  addColumnIfMissing(db, "range_log", "custom_fields_json", "TEXT");
  addColumnIfMissing(db, "courses_of_fire", "target_type_id", "TEXT REFERENCES target_types(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "courses_of_fire", "passing_score_percent", "REAL");
  addColumnIfMissing(db, "courses_of_fire", "columns_json", "TEXT");
  addColumnIfMissing(db, "courses_of_fire", "scorecard_json", "TEXT");
  addColumnIfMissing(db, "cof_phases", "notes", "TEXT");
  const addedSortOrder = addColumnIfMissing(db, "cof_strings", "sort_order", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "cof_strings", "row_type", "TEXT NOT NULL DEFAULT 'string'");
  addColumnIfMissing(db, "cof_strings", "extra_json", "TEXT");
  if (addedSortOrder) {
    db.exec(`update cof_strings set sort_order = rowid`);
  }
  rebuildCofStringsIfNeeded(db);

  migrateScoringZonesToTargetTypes(db);
  dropGroupTables(db);
  migrateReceiptImages(db);
  seedAccessoryMounts(db);

  const courseCount = (db.prepare("select count(*) as n from courses_of_fire").get() as { n: number }).n;
  if (courseCount === 0) {
    const seedPath = path.join(dir, "courses-of-fire.seed.json");
    if (fs.existsSync(seedPath)) {
      const patch = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as CofPatch;
      applyCofPatch(db, patch);
    }
  }

  seedDropdownOptions(db);

  for (const m of ["RESET-PIN", "RESET-PIN.txt"]) {
    const marker = path.join(dir, m);
    if (fs.existsSync(marker)) {
      db.prepare(`delete from app_settings where key = 'pin_hash'`).run();
      fs.rmSync(marker, { force: true });
    }
  }

  return db;
}

export function getDb(): Database.Database {
  if (!global.__firearmsDb) {
    global.__firearmsDb = initDb();
  }
  return global.__firearmsDb;
}
