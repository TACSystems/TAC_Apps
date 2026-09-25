import Database from "better-sqlite3-multiple-ciphers";
import path from "path";
import { sqlKey } from "@core/lib/security-state";
import { appProfile } from "@core/lib/app-profile";

type DbProvider = { getDb: () => Database.Database; closeDb: () => void };

declare global {
  var __tacDbProvider: DbProvider | undefined;
}

export function registerDbProvider(p: DbProvider) {
  global.__tacDbProvider = p;
}

function provider(): DbProvider {
  if (!global.__tacDbProvider) throw new Error("Database is not set up yet.");
  return global.__tacDbProvider;
}

export function getDb(): Database.Database {
  return provider().getDb();
}

export function closeDb() {
  if (global.__tacDbProvider) global.__tacDbProvider.closeDb();
}

export function dataDir() {
  return process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
}

export function dbPath() {
  return path.join(dataDir(), appProfile().dbFile);
}

export function applyKey(db: Database.Database, key: Buffer) {
  db.pragma("cipher = 'sqlcipher'");
  db.pragma("legacy = 4");
  db.pragma(`key = "${sqlKey(key)}"`);
}

export function openRaw(file: string, key?: Buffer, options?: Database.Options) {
  const db = new Database(file, options);
  if (key) applyKey(db, key);
  return db;
}

export function rekeyFile(file: string, fromKey: Buffer | null, toKey: Buffer | null) {
  const db = openRaw(file, fromKey ?? undefined);
  try {
    db.pragma("journal_mode = DELETE");
    if (toKey) {
      db.pragma("cipher = 'sqlcipher'");
      db.pragma("legacy = 4");
      db.pragma(`rekey = "${sqlKey(toKey)}"`);
    } else {
      db.pragma(`rekey = ""`);
    }
  } finally {
    db.close();
  }
  const check = openRaw(file, toKey ?? undefined, { fileMustExist: true });
  try {
    const ok = check.pragma("integrity_check", { simple: true });
    if (ok !== "ok") throw new Error("Database check failed after changing encryption.");
    check.pragma("journal_mode = WAL");
  } finally {
    check.close();
  }
}
