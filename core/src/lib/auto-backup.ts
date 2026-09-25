import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { dataDir, getDb } from "@core/lib/db-core";
import { createBackup } from "@core/lib/backup";
import { isUnlocked } from "@core/lib/security-state";
import { todayISO } from "@core/lib/format";
import { appProfile } from "@core/lib/app-profile";

export type AutoBackupFrequency = "off" | "daily" | "weekly";

export type AutoBackupConfig = { frequency: AutoBackupFrequency; folder: string; keep: number };

export type AutoBackupStatus = {
  lastRun: string | null;
  lastFile: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
};

export const DEFAULT_AUTO_BACKUP: AutoBackupConfig = { frequency: "off", folder: "", keep: 10 };

const prefix = () => appProfile().autoBackupPrefix;
const INTERVAL_MS: Record<AutoBackupFrequency, number> = {
  off: Infinity,
  daily: 24 * 3600_000,
  weekly: 7 * 24 * 3600_000,
};

function readJson<T>(db: Database.Database, key: string, fallback: T): T {
  const row = db.prepare(`select value from app_settings where key = ?`).get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return { ...fallback, ...JSON.parse(row.value) };
  } catch {
    return fallback;
  }
}

function writeJson(db: Database.Database, key: string, value: unknown) {
  db.prepare(
    `insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value`
  ).run(key, JSON.stringify(value));
}

export function getAutoBackup(db: Database.Database): AutoBackupConfig {
  const c = readJson(db, "autoBackup", DEFAULT_AUTO_BACKUP);
  return {
    frequency: ["off", "daily", "weekly"].includes(c.frequency) ? c.frequency : "off",
    folder: typeof c.folder === "string" ? c.folder : "",
    keep: Math.min(100, Math.max(1, Math.round(Number(c.keep) || 10))),
  };
}

export function saveAutoBackup(db: Database.Database, cfg: AutoBackupConfig) {
  writeJson(db, "autoBackup", cfg);
}

export function getAutoBackupStatus(db: Database.Database): AutoBackupStatus {
  return readJson(db, "autoBackupStatus", { lastRun: null, lastFile: null, lastError: null, lastErrorAt: null });
}

function setStatus(db: Database.Database, patch: Partial<AutoBackupStatus>) {
  writeJson(db, "autoBackupStatus", { ...getAutoBackupStatus(db), ...patch });
}

export function folderProblem(folder: string): string | null {
  if (!folder) return "No backup folder chosen.";
  if (!path.isAbsolute(folder)) return "The backup folder must be a full path.";
  try {
    if (!fs.statSync(folder).isDirectory()) return "The backup folder isn't a folder.";
    fs.accessSync(folder, fs.constants.W_OK);
  } catch {
    return "The backup folder can't be reached. Is the drive plugged in?";
  }
  return null;
}

function prune(folder: string, keep: number) {
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.startsWith(prefix()) && /\.(zip|tlbak)$/.test(f))
    .sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    fs.rmSync(path.join(folder, f), { force: true });
  }
}

export function runAutoBackupNow(db: Database.Database = getDb()) {
  const cfg = getAutoBackup(db);
  const problem = folderProblem(cfg.folder);
  const now = new Date();
  if (problem) {
    setStatus(db, { lastError: problem, lastErrorAt: now.toISOString() });
    return { ok: false, error: problem };
  }
  try {
    const { buffer, encrypted } = createBackup(db);
    const stamp = now.toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
    const name = `${prefix()}${stamp}.${encrypted ? "tlbak" : "zip"}`;
    const target = path.join(cfg.folder, name);
    fs.writeFileSync(`${target}.part`, buffer);
    fs.renameSync(`${target}.part`, target);
    prune(cfg.folder, cfg.keep);
    setStatus(db, { lastRun: now.toISOString(), lastFile: target, lastError: null, lastErrorAt: null });
    return { ok: true, file: target };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backup failed.";
    setStatus(db, { lastError: msg, lastErrorAt: now.toISOString() });
    return { ok: false, error: msg };
  }
}

export function autoBackupDue(db: Database.Database) {
  const cfg = getAutoBackup(db);
  if (cfg.frequency === "off") return false;
  const status = getAutoBackupStatus(db);
  const last = status.lastRun ? Date.parse(status.lastRun) : 0;
  const lastErr = status.lastErrorAt ? Date.parse(status.lastErrorAt) : 0;
  if (Date.now() - lastErr < 3600_000) return false;
  return Date.now() - last >= INTERVAL_MS[cfg.frequency];
}

export function runAutoBackupIfDue() {
  if (!isUnlocked()) return { ok: false, skipped: "locked" };
  const db = getDb();
  if (!autoBackupDue(db)) return { ok: true, skipped: "not due" };
  return runAutoBackupNow(db);
}

export function preMigrationBackup(db: Database.Database) {
  const current = process.env.TAC_LOG_VERSION;
  if (!current) return;
  let previous: string | null = null;
  try {
    const row = db.prepare(`select value from app_settings where key = 'last_version'`).get() as
      | { value: string }
      | undefined;
    previous = row ? JSON.parse(row.value) : null;
  } catch {
    previous = appProfile().legacyVersion;
  }
  if (previous === current) return;
  const hasData = db.prepare(`select 1 from sqlite_master where type = 'table' and name = ?`).get(appProfile().requiredTables[0]);
  if (!hasData) return;
  const dir = path.join(dataDir(), "pre-upgrade");
  fs.mkdirSync(dir, { recursive: true });
  db.pragma("wal_checkpoint(TRUNCATE)");
  const stamp = todayISO();
  const name = `${appProfile().dbFile.replace(/\.db$/, "")}-${previous ?? appProfile().legacyVersion}-before-${current}-${stamp}.db`;
  fs.copyFileSync(path.join(dataDir(), appProfile().dbFile), path.join(dir, name));
  const copies = fs.readdirSync(dir).filter((f) => f.endsWith(".db")).sort((a, b) => {
    return fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs;
  });
  for (const f of copies.slice(0, Math.max(0, copies.length - 3))) fs.rmSync(path.join(dir, f), { force: true });
}
