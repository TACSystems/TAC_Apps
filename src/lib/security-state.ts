import Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

export type SecurityMode = "none" | "pin" | "password";

export type LockoutRecord = { failures: number; level: number; until: number };

export type SecurityFile = {
  version: 1;
  mode: SecurityMode;
  pin?: { salt: string; hash: string };
  encryption?: {
    salt: string;
    wrapped: string;
    recoverySalt: string;
    recoveryWrapped: string;
  };
  lockout?: Record<string, LockoutRecord>;
};

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_STEPS_SECONDS = [30, 60, 300, 900, 3600];

export class LockedError extends Error {
  constructor() {
    super("TAC-LOG is locked.");
    this.name = "LockedError";
  }
}

declare global {
  var __taclogSecurity: SecurityFile | undefined;
  var __taclogUnlocked: boolean | undefined;
  var __taclogDataKey: Buffer | undefined;
}

export function securityDir() {
  return process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
}

function securityPath() {
  return path.join(securityDir(), "security.json");
}

function legacyPin(): SecurityFile["pin"] | undefined {
  const dbPath = path.join(securityDir(), "firearms.db");
  if (!fs.existsSync(dbPath)) return undefined;
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const row = db.prepare(`select value from app_settings where key = 'pin_hash'`).get() as
        | { value: string }
        | undefined;
      return row ? JSON.parse(row.value) : undefined;
    } finally {
      db.close();
    }
  } catch {
    return undefined;
  }
}

function applyResetMarker(sec: SecurityFile) {
  let changed = false;
  for (const m of ["RESET-PIN", "RESET-PIN.txt"]) {
    const marker = path.join(securityDir(), m);
    if (fs.existsSync(marker)) {
      if (sec.mode === "pin") {
        sec.mode = "none";
        delete sec.pin;
        if (sec.lockout) delete sec.lockout.unlock;
        changed = true;
      }
      fs.rmSync(marker, { force: true });
    }
  }
  return changed;
}

export function readSecurity(): SecurityFile {
  if (global.__taclogSecurity) {
    if (applyResetMarker(global.__taclogSecurity)) writeSecurity(global.__taclogSecurity);
    return global.__taclogSecurity;
  }
  const file = securityPath();
  let sec: SecurityFile;
  if (fs.existsSync(file)) {
    sec = JSON.parse(fs.readFileSync(file, "utf8")) as SecurityFile;
  } else {
    const pin = legacyPin();
    sec = pin ? { version: 1, mode: "pin", pin } : { version: 1, mode: "none" };
    if (pin) {
      fs.mkdirSync(securityDir(), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(sec, null, 2));
    }
  }
  global.__taclogSecurity = sec;
  if (applyResetMarker(sec)) writeSecurity(sec);
  return sec;
}

export function writeSecurity(sec: SecurityFile) {
  fs.mkdirSync(securityDir(), { recursive: true });
  const file = securityPath();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sec, null, 2));
  fs.renameSync(tmp, file);
  global.__taclogSecurity = sec;
}

export function securityMode(): SecurityMode {
  return readSecurity().mode;
}

export function isEncrypted() {
  return Boolean(readSecurity().encryption);
}

export function isUnlocked() {
  return securityMode() === "none" || global.__taclogUnlocked === true;
}

export function setUnlocked(dataKey?: Buffer) {
  global.__taclogUnlocked = true;
  if (dataKey) global.__taclogDataKey = dataKey;
}

export function clearUnlocked() {
  global.__taclogUnlocked = false;
  global.__taclogDataKey = undefined;
}

export function dataKey(): Buffer | undefined {
  return global.__taclogDataKey;
}

export function deriveKey(secret: string, saltHex: string) {
  return scryptSync(secret.normalize("NFKC"), Buffer.from(saltHex, "hex"), 32, {
    N: 1 << 15,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  });
}

export function seal(key: Buffer, plain: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function unseal(key: Buffer, sealed: Buffer) {
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}

export const FILE_MAGIC = Buffer.from("TLENC1\u0000\u0000", "latin1");

export function isSealedFile(buf: Buffer) {
  return buf.length > FILE_MAGIC.length + 28 && buf.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC);
}

export function sealFile(buf: Buffer) {
  const key = dataKey();
  if (!isEncrypted() || !key) return buf;
  return Buffer.concat([FILE_MAGIC, seal(key, buf)]);
}

export function openFile(buf: Buffer) {
  if (!isSealedFile(buf)) return buf;
  const key = dataKey();
  if (!key) throw new LockedError();
  return unseal(key, buf.subarray(FILE_MAGIC.length));
}

export function sqlKey(key: Buffer) {
  return `x'${key.toString("hex")}'`;
}

export function lockoutState(scope: string): { waitUntil: number; attemptsLeft: number } {
  const rec = readSecurity().lockout?.[scope];
  const now = Date.now();
  if (!rec) return { waitUntil: 0, attemptsLeft: MAX_ATTEMPTS };
  return {
    waitUntil: rec.until > now ? rec.until : 0,
    attemptsLeft: MAX_ATTEMPTS - rec.failures,
  };
}

export function lockoutSeconds(scope: string) {
  const { waitUntil } = lockoutState(scope);
  return waitUntil ? Math.ceil((waitUntil - Date.now()) / 1000) : 0;
}

export function recordFailure(scope: string): { waitUntil: number; attemptsLeft: number } {
  const sec = readSecurity();
  const lockout = { ...(sec.lockout ?? {}) };
  const rec = { ...(lockout[scope] ?? { failures: 0, level: 0, until: 0 }) };
  rec.failures += 1;
  let waitUntil = 0;
  if (rec.failures >= MAX_ATTEMPTS) {
    const step = LOCKOUT_STEPS_SECONDS[Math.min(rec.level, LOCKOUT_STEPS_SECONDS.length - 1)];
    rec.until = Date.now() + step * 1000;
    rec.level += 1;
    rec.failures = 0;
    waitUntil = rec.until;
  }
  lockout[scope] = rec;
  writeSecurity({ ...sec, lockout });
  return { waitUntil, attemptsLeft: waitUntil ? MAX_ATTEMPTS : MAX_ATTEMPTS - rec.failures };
}

export function recordSuccess(scope: string) {
  const sec = readSecurity();
  if (!sec.lockout?.[scope]) return;
  const lockout = { ...sec.lockout };
  delete lockout[scope];
  writeSecurity({ ...sec, lockout });
}
