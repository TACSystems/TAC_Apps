import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { applyCofPatch, type CofPatch } from "./cof-patch";
import { seedDropdownOptions } from "./dropdown-options";
import { SCHEMA_SQL } from "./schema";

declare global {
  var __firearmsDb: Database.Database | undefined;
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function initDb(): Database.Database {
  const dataDir = process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "firearms.db");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(SCHEMA_SQL);

  addColumnIfMissing(db, "firearms", "last_cleaned_at_shots", "INTEGER");
  addColumnIfMissing(db, "firearms", "clean_interval_rounds", "INTEGER");
  addColumnIfMissing(db, "ammo_purchases", "lot_number", "TEXT");
  addColumnIfMissing(db, "range_log", "ammo_lot", "TEXT");

  const courseCount = (db.prepare("select count(*) as n from courses_of_fire").get() as { n: number }).n;
  if (courseCount === 0) {
    const seedPath = path.join(dataDir, "courses-of-fire.seed.json");
    if (fs.existsSync(seedPath)) {
      const patch = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as CofPatch;
      applyCofPatch(db, patch);
    }
  }

  seedDropdownOptions(db);

  return db;
}

export function getDb(): Database.Database {
  if (!global.__firearmsDb) {
    global.__firearmsDb = initDb();
  }
  return global.__firearmsDb;
}
