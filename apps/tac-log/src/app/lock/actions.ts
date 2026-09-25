"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { updateSettings } from "@/lib/settings";
import * as sec from "@/lib/security";
import { runAutoBackupIfDue } from "@/lib/auto-backup";

function done<T>(res: T) {
  revalidatePath("/", "layout");
  return res;
}

export async function unlock(secret: string) {
  const res = sec.unlock(String(secret ?? ""));
  if (res.ok) {
    try {
      runAutoBackupIfDue();
    } catch {}
  }
  return done(res);
}

export async function unlockWithRecovery(recovery: string, password: string, confirm: string) {
  return done(sec.unlockWithRecovery(String(recovery ?? ""), String(password ?? ""), String(confirm ?? "")));
}

export async function lockNow() {
  sec.lock();
  revalidatePath("/", "layout");
}

export async function savePin(current: string, next: string, confirm: string) {
  return done(sec.setPin(String(current ?? ""), String(next ?? ""), String(confirm ?? "")));
}

export async function removePin(current: string) {
  return done(sec.removePin(String(current ?? "")));
}

export async function enableEncryption(current: string, password: string, confirm: string) {
  return done(sec.enableEncryption(String(current ?? ""), String(password ?? ""), String(confirm ?? "")));
}

export async function changePassword(current: string, next: string, confirm: string) {
  return done(sec.changePassword(String(current ?? ""), String(next ?? ""), String(confirm ?? "")));
}

export async function newRecoveryKey(current: string) {
  return done(sec.newRecovery(String(current ?? "")));
}

export async function disableEncryption(current: string) {
  return done(sec.disableEncryption(String(current ?? "")));
}

export async function saveAutoLock(minutes: number) {
  updateSettings(getDb(), { autoLockMinutes: minutes });
  revalidatePath("/", "layout");
  return { ok: true };
}
