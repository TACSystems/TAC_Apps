import type Database from "better-sqlite3";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const LOCK_COOKIE = "taclog_session";

declare global {
  var __taclogTokens: Set<string> | undefined;
  var __taclogFailures: { count: number; until: number } | undefined;
}

function tokens() {
  if (!global.__taclogTokens) global.__taclogTokens = new Set();
  return global.__taclogTokens;
}

function failures() {
  if (!global.__taclogFailures) global.__taclogFailures = { count: 0, until: 0 };
  return global.__taclogFailures;
}

function getPinRecord(db: Database.Database): { salt: string; hash: string } | null {
  const row = db.prepare(`select value from app_settings where key = 'pin_hash'`).get() as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function pinIsSet(db: Database.Database) {
  return getPinRecord(db) !== null;
}

export function validPinFormat(pin: string) {
  return /^\d{4,12}$/.test(pin);
}

export function setPin(db: Database.Database, pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  db.prepare(
    `insert into app_settings (key, value) values ('pin_hash', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify({ salt, hash }));
}

export function clearPin(db: Database.Database) {
  db.prepare(`delete from app_settings where key = 'pin_hash'`).run();
}

export function checkPin(db: Database.Database, pin: string): { ok: boolean; waitSeconds?: number } {
  const f = failures();
  const now = Date.now();
  if (f.until > now) return { ok: false, waitSeconds: Math.ceil((f.until - now) / 1000) };
  const rec = getPinRecord(db);
  if (!rec) return { ok: true };
  const attempt = scryptSync(pin, rec.salt, 32);
  const ok = timingSafeEqual(attempt, Buffer.from(rec.hash, "hex"));
  if (ok) {
    f.count = 0;
    f.until = 0;
    return { ok: true };
  }
  f.count += 1;
  if (f.count >= 5) {
    f.until = now + 30_000;
    f.count = 0;
    return { ok: false, waitSeconds: 30 };
  }
  return { ok: false };
}

export function issueToken() {
  const t = randomBytes(32).toString("hex");
  tokens().add(t);
  return t;
}

export function revokeToken(t: string | undefined) {
  if (t) tokens().delete(t);
}

export async function isUnlocked(): Promise<boolean> {
  const db = getDb();
  if (!pinIsSet(db)) return true;
  const store = await cookies();
  const t = store.get(LOCK_COOKIE)?.value;
  return Boolean(t && tokens().has(t));
}
