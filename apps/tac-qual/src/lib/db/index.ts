import Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { applyCofPatch, type CofPatch } from "@core/lib/cof";
import { seedDropdownOptions } from "./dropdown-options";
import { SCHEMA_SQL, VIEWS_SQL } from "./schema";
import { LockedError, dataKey, isEncrypted, isUnlocked } from "@core/lib/security-state";
import { applyKey, dataDir, dbPath, openRaw, registerDbProvider, rekeyFile } from "@core/lib/db-core";
import "@/lib/app-config";
import { preMigrationBackup } from "@/lib/auto-backup";
import { setDateFormat } from "@/lib/display";
import { getSettings } from "@/lib/settings";
import { runMigrations, type Migration } from "@core/lib/migrations";

declare global {
  var __tacqualDb: Database.Database | undefined;
}

// TAC-QUAL starts clean: SCHEMA_SQL creates the baseline, and migration 1
// records it so every later change gets a numbered step of its own.
const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: "baseline-0.1.0",
    up: () => {},
  },
];

function closeLocalDb() {
  if (global.__tacqualDb) {
    try {
      global.__tacqualDb.close();
    } catch {}
    global.__tacqualDb = undefined;
  }
}

function initDb(): Database.Database {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });

  let key: Buffer | undefined;
  if (isEncrypted()) {
    key = dataKey();
    if (!key) throw new LockedError();
  }

  const fresh = !fs.existsSync(dbPath());
  const db = openRaw(dbPath(), key);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  preMigrationBackup(db);

  db.exec(SCHEMA_SQL);
  runMigrations(db, MIGRATIONS);
  db.exec(VIEWS_SQL);

  const courseCount = (db.prepare("select count(*) as n from courses_of_fire").get() as { n: number }).n;
  if (courseCount === 0) {
    const seedPath = path.join(dir, "courses-of-fire.seed.json");
    if (fs.existsSync(seedPath)) {
      const patch = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as CofPatch;
      applyCofPatch(db, patch);
    }
  }

  seedDropdownOptions(db);

  db.prepare(`insert or ignore into instructor_profile (id, name) values ('me', '')`).run();

  const initial = getSettings(db);
  setDateFormat(initial.dateFormat);

  db.prepare(
    `insert into app_settings (key, value) values ('last_version', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify(process.env.TAC_LOG_VERSION ?? "dev"));

  if (fresh && process.env.TAC_LOG_VERSION) {
    db.prepare(`insert or ignore into app_settings (key, value) values ('whats_new_seen', ?)`).run(
      JSON.stringify(process.env.TAC_LOG_VERSION)
    );
  }

  return db;
}

function openDb(): Database.Database {
  if (!isUnlocked()) throw new LockedError();
  if (!global.__tacqualDb) {
    global.__tacqualDb = initDb();
  }
  return global.__tacqualDb;
}

registerDbProvider({ getDb: openDb, closeDb: closeLocalDb });

export { applyKey, dataDir, dbPath, openRaw, rekeyFile };
export const getDb = openDb;
export const closeDb = closeLocalDb;
