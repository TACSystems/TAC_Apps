import Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { closeDb, dataDir, getDb, rekeyFile } from "@/lib/db";
import { createZip, readZip, type ZipEntry } from "@/lib/zip";
import {
  dataKey,
  deriveKey,
  isEncrypted,
  lockoutState,
  openFile,
  recordFailure,
  recordSuccess,
  seal,
  sealFile,
  unseal,
} from "@/lib/security-state";

const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000", "latin1");
const BACKUP_MAGIC = Buffer.from("TLBAK1\u0000\u0000", "latin1");
const BACKUP_SCOPE = "backup";

export class BackupPasswordError extends Error {
  waitUntil: number;
  attemptsLeft: number;
  constructor(message: string, waitUntil = 0, attemptsLeft = 0) {
    super(message);
    this.waitUntil = waitUntil;
    this.attemptsLeft = attemptsLeft;
  }
}

type SavedBackupKey = { salt: string; key: string };

export function savedBackupKey(db: Database.Database): SavedBackupKey | null {
  const row = db.prepare(`select value from app_settings where key = 'backup_key'`).get() as
    | { value: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function saveBackupPassword(db: Database.Database, password: string | null) {
  if (!password) {
    db.prepare(`delete from app_settings where key = 'backup_key'`).run();
    return;
  }
  const salt = randomBytes(16).toString("hex");
  const key = deriveKey(password, salt).toString("hex");
  db.prepare(
    `insert into app_settings (key, value) values ('backup_key', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify({ salt, key }));
}

export function isEncryptedBackup(buf: Buffer) {
  return buf.length > BACKUP_MAGIC.length + 16 + 28 && buf.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC);
}

function envelope(zip: Buffer, salt: Buffer, key: Buffer) {
  return Buffer.concat([BACKUP_MAGIC, salt, seal(key, zip)]);
}

function openEnvelope(buf: Buffer, password: string) {
  const lock = lockoutState(BACKUP_SCOPE);
  if (lock.waitUntil) throw new BackupPasswordError("Too many wrong backup passwords.", lock.waitUntil);
  const salt = buf.subarray(BACKUP_MAGIC.length, BACKUP_MAGIC.length + 16);
  const body = buf.subarray(BACKUP_MAGIC.length + 16);
  try {
    const out = unseal(deriveKey(password, salt.toString("hex")), body);
    recordSuccess(BACKUP_SCOPE);
    return out;
  } catch {
    const f = recordFailure(BACKUP_SCOPE);
    throw new BackupPasswordError(
      f.waitUntil ? "Too many wrong backup passwords." : "That backup password is wrong.",
      f.waitUntil,
      f.attemptsLeft
    );
  }
}

function walk(dir: string, base: string, out: ZipEntry[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = `${base}/${entry.name}`;
    if (entry.isDirectory()) walk(full, rel, out);
    else if (entry.isFile()) out.push({ name: rel, data: openFile(fs.readFileSync(full)) });
  }
}

export function backupZip(db: Database.Database): { buffer: Buffer; receiptCount: number } {
  const snapshot = db.serialize();
  const receipts: ZipEntry[] = [];
  walk(path.join(dataDir(), "receipts"), "receipts", receipts);
  const manifest = {
    app: "TAC-LOG",
    format: 1,
    created: new Date().toISOString(),
    version: process.env.TAC_LOG_VERSION ?? null,
    receipts: receipts.length,
  };
  const buffer = createZip([
    { name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2)) },
    { name: "firearms.db", data: Buffer.from(snapshot) },
    ...receipts,
  ]);
  return { buffer, receiptCount: receipts.length };
}

export function createBackup(
  db: Database.Database = getDb(),
  password?: string
): { buffer: Buffer; receiptCount: number; encrypted: boolean } {
  const { buffer, receiptCount } = backupZip(db);
  if (password) {
    const salt = randomBytes(16);
    return { buffer: envelope(buffer, salt, deriveKey(password, salt.toString("hex"))), receiptCount, encrypted: true };
  }
  const saved = savedBackupKey(db);
  if (saved) {
    return {
      buffer: envelope(buffer, Buffer.from(saved.salt, "hex"), Buffer.from(saved.key, "hex")),
      receiptCount,
      encrypted: true,
    };
  }
  if (isEncrypted()) {
    throw new Error("Database encryption is on, so backups need a password. Set a backup password in Settings first.");
  }
  return { buffer, receiptCount, encrypted: false };
}

function validateDatabase(file: string) {
  let check: Database.Database | null = null;
  try {
    check = new Database(file, { readonly: true, fileMustExist: true });
    const tables = new Set(
      (check.prepare(`select name from sqlite_master where type = 'table'`).all() as { name: string }[]).map(
        (t) => t.name
      )
    );
    if (!tables.has("firearms") || !tables.has("courses_of_fire")) {
      throw new Error("That file isn't a TAC-LOG database.");
    }
    const integrity = check.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error("That backup's database failed its integrity check.");
  } finally {
    check?.close();
  }
}

export function restoreBackup(
  input: Buffer,
  password?: string
): { receiptCount: number | null; safetyFolder: string } {
  const dir = dataDir();
  let buf = input;
  if (isEncryptedBackup(buf)) {
    if (!password) throw new BackupPasswordError("This backup is password-protected. Enter its password.", 0, -1);
    buf = openEnvelope(buf, password);
  }
  let dbBytes: Buffer;
  let receipts: ZipEntry[] | null = null;

  if (buf.subarray(0, 4).toString("latin1") === "PK\u0003\u0004") {
    const entries = readZip(buf);
    const dbEntry = entries.find((e) => e.name === "firearms.db");
    if (!dbEntry) throw new Error("That zip doesn't contain a TAC-LOG database.");
    dbBytes = dbEntry.data;
    receipts = entries.filter((e) => e.name.startsWith("receipts/"));
    for (const r of receipts) {
      const parts = r.name.split("/");
      if (parts.some((p) => p === ".." || p === "" || p.includes("\\")) || parts.length !== 3) {
        throw new Error("Backup contains an unexpected file path. Nothing was restored.");
      }
    }
  } else if (buf.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
    dbBytes = buf;
  } else {
    throw new Error("Choose a TAC-LOG backup (.zip) or database (.db) file.");
  }

  const tmp = path.join(dir, `restore-${Date.now()}.tmp.db`);
  fs.writeFileSync(tmp, dbBytes);
  try {
    validateDatabase(tmp);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safety = path.join(dir, "pre-restore", stamp);
  fs.mkdirSync(safety, { recursive: true });

  closeDb();
  const live = path.join(dir, "firearms.db");
  if (isEncrypted()) {
    const key = dataKey();
    if (!key) throw new Error("TAC-LOG is locked.");
    rekeyFile(tmp, null, key);
  }
  if (fs.existsSync(live)) fs.renameSync(live, path.join(safety, "firearms.db"));
  fs.rmSync(`${live}-wal`, { force: true });
  fs.rmSync(`${live}-shm`, { force: true });
  fs.renameSync(tmp, live);

  if (receipts) {
    const receiptsDir = path.join(dir, "receipts");
    if (fs.existsSync(receiptsDir)) fs.renameSync(receiptsDir, path.join(safety, "receipts"));
    for (const r of receipts) {
      const target = path.join(dir, ...r.name.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, r.data);
    }
  }

  getDb();
  if (isEncrypted()) sealAllAttachments();
  return { receiptCount: receipts ? receipts.length : null, safetyFolder: safety };
}

export function sealAllAttachments() {
  return sealTree(path.join(dataDir(), "receipts"));
}

export function sealTree(root: string) {
  const files: string[] = [];
  const collect = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) collect(full);
      else if (e.isFile()) files.push(full);
    }
  };
  collect(root);
  for (const f of files) {
    const raw = fs.readFileSync(f);
    const plain = openFile(raw);
    const next = sealFile(plain);
    if (!next.equals(raw)) {
      fs.writeFileSync(`${f}.tmp`, next);
      fs.renameSync(`${f}.tmp`, f);
    }
  }
  return files.length;
}
