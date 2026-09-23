import fs from "fs";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import path from "path";
import { closeDb, dataDir, dbPath, getDb, rekeyFile } from "@/lib/db";
import { sealAllAttachments, sealTree } from "@/lib/backup";
import {
  LOCKOUT_STEPS_SECONDS,
  MAX_ATTEMPTS,
  clearUnlocked,
  dataKey,
  deriveKey,
  isUnlocked,
  lockoutState,
  readSecurity,
  recordFailure,
  recordSuccess,
  seal,
  setUnlocked,
  unseal,
  writeSecurity,
  type SecurityFile,
} from "@/lib/security-state";

export { isUnlocked, securityMode, isEncrypted, lockoutState } from "@/lib/security-state";

const SCOPE = "unlock";

export type AuthResult = {
  ok: boolean;
  error?: string;
  message?: string;
  waitUntil?: number;
  attemptsLeft?: number;
  recoveryKey?: string;
};

function describeWait(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} seconds`;
  const m = Math.ceil(s / 60);
  return m === 1 ? "1 minute" : `${m} minutes`;
}

export function nextLockoutSeconds() {
  const rec = readSecurity().lockout?.[SCOPE];
  return LOCKOUT_STEPS_SECONDS[Math.min(rec?.level ?? 0, LOCKOUT_STEPS_SECONDS.length - 1)];
}

function lockedOut(): AuthResult | null {
  const s = lockoutState(SCOPE);
  if (!s.waitUntil) return null;
  return {
    ok: false,
    error: `Too many wrong attempts. Try again in ${describeWait(s.waitUntil - Date.now())}.`,
    waitUntil: s.waitUntil,
  };
}

function failed(what: string): AuthResult {
  const f = recordFailure(SCOPE);
  if (f.waitUntil) {
    return {
      ok: false,
      error: `Too many wrong attempts. Try again in ${describeWait(f.waitUntil - Date.now())}.`,
      waitUntil: f.waitUntil,
    };
  }
  const next = describeWait(nextLockoutSeconds() * 1000);
  return {
    ok: false,
    error: `Wrong ${what}. ${f.attemptsLeft} ${f.attemptsLeft === 1 ? "attempt" : "attempts"} left before a ${next} wait.`,
    attemptsLeft: f.attemptsLeft,
  };
}

export function validPinFormat(pin: string) {
  return /^\d{4,12}$/.test(pin);
}

export function validPassword(pw: string) {
  return typeof pw === "string" && pw.length >= 8 && pw.length <= 256;
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(pin, salt, 32).toString("hex") };
}

function pinMatches(sec: SecurityFile, pin: string) {
  if (!sec.pin) return false;
  const attempt = scryptSync(pin, sec.pin.salt, 32);
  return timingSafeEqual(attempt, Buffer.from(sec.pin.hash, "hex"));
}

function unwrapWithPassword(sec: SecurityFile, password: string): Buffer | null {
  if (!sec.encryption) return null;
  try {
    return unseal(deriveKey(password, sec.encryption.salt), Buffer.from(sec.encryption.wrapped, "hex"));
  } catch {
    return null;
  }
}

function normalizeRecovery(key: string) {
  return key.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function unwrapWithRecovery(sec: SecurityFile, recovery: string): Buffer | null {
  if (!sec.encryption) return null;
  try {
    return unseal(
      deriveKey(normalizeRecovery(recovery), sec.encryption.recoverySalt),
      Buffer.from(sec.encryption.recoveryWrapped, "hex")
    );
  } catch {
    return null;
  }
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function newRecoveryKey() {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{1,4}/g)!.join("-");
}

function safetyCopies() {
  const out: string[] = [];
  const pre = path.join(dataDir(), "pre-upgrade");
  if (fs.existsSync(pre)) for (const f of fs.readdirSync(pre)) if (f.endsWith(".db")) out.push(path.join(pre, f));
  const restore = path.join(dataDir(), "pre-restore");
  if (fs.existsSync(restore)) {
    for (const d of fs.readdirSync(restore)) {
      const f = path.join(restore, d, "firearms.db");
      if (fs.existsSync(f)) out.push(f);
    }
  }
  return out;
}

function rekeySafetyCopies(from: Buffer | null, to: Buffer | null) {
  for (const f of safetyCopies()) {
    try {
      rekeyFile(f, from, to);
    } catch {}
  }
  const restore = path.join(dataDir(), "pre-restore");
  if (fs.existsSync(restore)) {
    for (const d of fs.readdirSync(restore)) sealTree(path.join(restore, d, "receipts"));
  }
}

function wrapKey(key: Buffer, password: string, recovery?: string, prev?: SecurityFile["encryption"]) {
  const salt = randomBytes(16).toString("hex");
  const wrapped = seal(deriveKey(password, salt), key).toString("hex");
  if (recovery) {
    const recoverySalt = randomBytes(16).toString("hex");
    const recoveryWrapped = seal(deriveKey(normalizeRecovery(recovery), recoverySalt), key).toString("hex");
    return { salt, wrapped, recoverySalt, recoveryWrapped };
  }
  return { salt, wrapped, recoverySalt: prev!.recoverySalt, recoveryWrapped: prev!.recoveryWrapped };
}

export function verifyCredential(secret: string): AuthResult {
  const sec = readSecurity();
  if (sec.mode === "none") return { ok: true };
  const out = lockedOut();
  if (out) return out;
  if (sec.mode === "pin") {
    if (!pinMatches(sec, secret)) return failed("PIN");
  } else if (!unwrapWithPassword(sec, secret)) {
    return failed("password");
  }
  recordSuccess(SCOPE);
  return { ok: true };
}

export function unlock(secret: string): AuthResult {
  const sec = readSecurity();
  if (sec.mode === "none") {
    setUnlocked();
    return { ok: true };
  }
  const out = lockedOut();
  if (out) return out;
  if (sec.mode === "pin") {
    if (!pinMatches(sec, secret)) return failed("PIN");
    recordSuccess(SCOPE);
    setUnlocked();
    return { ok: true };
  }
  const key = unwrapWithPassword(sec, secret);
  if (!key) return failed("password");
  recordSuccess(SCOPE);
  setUnlocked(key);
  return { ok: true };
}

export function unlockWithRecovery(recovery: string, newPassword: string, confirm: string): AuthResult {
  const sec = readSecurity();
  if (!sec.encryption) return { ok: false, error: "Database encryption isn't on." };
  const out = lockedOut();
  if (out) return out;
  if (!validPassword(newPassword)) return { ok: false, error: "The new password must be at least 8 characters." };
  if (newPassword !== confirm) return { ok: false, error: "The two new password entries don't match." };
  const key = unwrapWithRecovery(sec, recovery);
  if (!key) return failed("recovery key");
  recordSuccess(SCOPE);
  writeSecurity({ ...readSecurity(), encryption: wrapKey(key, newPassword, undefined, sec.encryption) });
  setUnlocked(key);
  return { ok: true, message: "Password reset. Your recovery key still works." };
}

export function lock() {
  const sec = readSecurity();
  if (sec.mode === "none") return;
  if (sec.encryption) closeDb();
  clearUnlocked();
}

export function setPin(current: string, next: string, confirm: string): AuthResult {
  const sec = readSecurity();
  if (sec.mode === "password") return { ok: false, error: "Database encryption is on, so TAC-LOG uses a password instead of a PIN." };
  if (sec.mode === "pin") {
    const v = verifyCredential(current);
    if (!v.ok) return v;
  }
  if (!validPinFormat(next)) return { ok: false, error: "PIN must be 4 to 12 digits." };
  if (next !== confirm) return { ok: false, error: "The two new PIN entries don't match." };
  writeSecurity({ ...readSecurity(), mode: "pin", pin: hashPin(next) });
  setUnlocked();
  return { ok: true, message: "PIN saved. TAC-LOG will ask for it each time it opens." };
}

export function removePin(current: string): AuthResult {
  const sec = readSecurity();
  if (sec.mode !== "pin") return { ok: false, error: "No PIN is set." };
  const v = verifyCredential(current);
  if (!v.ok) return v;
  const nextSec = { ...readSecurity(), mode: "none" as const };
  delete nextSec.pin;
  writeSecurity(nextSec);
  return { ok: true, message: "PIN removed." };
}

export function enableEncryption(current: string, password: string, confirm: string): AuthResult {
  const sec = readSecurity();
  if (sec.encryption) return { ok: false, error: "Database encryption is already on." };
  if (!isUnlocked()) return { ok: false, error: "Unlock TAC-LOG first." };
  if (sec.mode === "pin") {
    const v = verifyCredential(current);
    if (!v.ok) return v;
  }
  if (!validPassword(password)) return { ok: false, error: "The password must be at least 8 characters." };
  if (password !== confirm) return { ok: false, error: "The two password entries don't match." };

  const db = getDb();
  const snapshot = Buffer.from(db.serialize());
  closeDb();

  const key = randomBytes(32);
  const recovery = newRecoveryKey();
  const file = dbPath();
  try {
    rekeyFile(file, null, key);
  } catch (err) {
    fs.writeFileSync(file, snapshot);
    fs.rmSync(`${file}-wal`, { force: true });
    fs.rmSync(`${file}-shm`, { force: true });
    return { ok: false, error: `Encryption failed and nothing was changed. ${err instanceof Error ? err.message : ""}`.trim() };
  }

  const nextSec: SecurityFile = { ...readSecurity(), mode: "password", encryption: wrapKey(key, password, recovery) };
  delete nextSec.pin;
  writeSecurity(nextSec);
  setUnlocked(key);
  getDb();
  sealAllAttachments();
  rekeySafetyCopies(null, key);
  return {
    ok: true,
    recoveryKey: recovery,
    message: "Database encryption is on. Print or write down the recovery key now — it won't be shown again.",
  };
}

export function changePassword(current: string, next: string, confirm: string): AuthResult {
  const sec = readSecurity();
  if (!sec.encryption) return { ok: false, error: "Database encryption isn't on." };
  const out = lockedOut();
  if (out) return out;
  const key = unwrapWithPassword(sec, current);
  if (!key) return failed("password");
  recordSuccess(SCOPE);
  if (!validPassword(next)) return { ok: false, error: "The new password must be at least 8 characters." };
  if (next !== confirm) return { ok: false, error: "The two new password entries don't match." };
  writeSecurity({ ...readSecurity(), encryption: wrapKey(key, next, undefined, sec.encryption) });
  return { ok: true, message: "Password changed." };
}

export function newRecovery(current: string): AuthResult {
  const sec = readSecurity();
  if (!sec.encryption) return { ok: false, error: "Database encryption isn't on." };
  const out = lockedOut();
  if (out) return out;
  const key = unwrapWithPassword(sec, current);
  if (!key) return failed("password");
  recordSuccess(SCOPE);
  const recovery = newRecoveryKey();
  const recoverySalt = randomBytes(16).toString("hex");
  const recoveryWrapped = seal(deriveKey(normalizeRecovery(recovery), recoverySalt), key).toString("hex");
  writeSecurity({ ...readSecurity(), encryption: { ...sec.encryption, recoverySalt, recoveryWrapped } });
  return { ok: true, recoveryKey: recovery, message: "New recovery key created. The old one no longer works." };
}

export function disableEncryption(current: string): AuthResult {
  const sec = readSecurity();
  if (!sec.encryption) return { ok: false, error: "Database encryption isn't on." };
  const out = lockedOut();
  if (out) return out;
  const key = unwrapWithPassword(sec, current);
  if (!key) return failed("password");
  recordSuccess(SCOPE);

  getDb();
  closeDb();
  rekeyFile(dbPath(), key, null);
  const plainSec: SecurityFile = { ...readSecurity(), mode: "none" };
  delete plainSec.encryption;
  writeSecurity(plainSec);
  setUnlocked(key);
  sealAllAttachments();
  rekeySafetyCopies(key, null);
  clearUnlocked();
  return { ok: true, message: "Database encryption is off. You can set a PIN again if you want one." };
}

export function securitySummary() {
  const sec = readSecurity();
  return {
    mode: sec.mode,
    encrypted: Boolean(sec.encryption),
    maxAttempts: MAX_ATTEMPTS,
    unlocked: isUnlocked(),
    hasKey: Boolean(dataKey()),
  };
}
