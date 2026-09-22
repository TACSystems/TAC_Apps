"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { updateSettings } from "@/lib/settings";
import {
  LOCK_COOKIE,
  checkPin,
  clearPin,
  issueToken,
  pinIsSet,
  revokeToken,
  setPin,
  validPinFormat,
} from "@/lib/lock";

async function startSession() {
  const store = await cookies();
  store.set(LOCK_COOKIE, issueToken(), { httpOnly: true, sameSite: "strict", path: "/" });
}

export async function unlock(pin: string): Promise<{ ok: boolean; error?: string }> {
  const res = checkPin(getDb(), String(pin ?? ""));
  if (!res.ok) {
    return {
      ok: false,
      error: res.waitSeconds ? `Too many wrong attempts. Try again in ${res.waitSeconds} seconds.` : "Wrong PIN.",
    };
  }
  await startSession();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function lockNow() {
  const store = await cookies();
  revokeToken(store.get(LOCK_COOKIE)?.value);
  store.delete(LOCK_COOKIE);
  revalidatePath("/", "layout");
}

export async function savePin(
  current: string,
  next: string,
  confirm: string
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const db = getDb();
  if (pinIsSet(db)) {
    const res = checkPin(db, current);
    if (!res.ok) return { ok: false, error: res.waitSeconds ? `Too many wrong attempts. Wait ${res.waitSeconds}s.` : "Current PIN is wrong." };
  }
  if (!validPinFormat(next)) return { ok: false, error: "PIN must be 4 to 12 digits." };
  if (next !== confirm) return { ok: false, error: "The two new PIN entries don't match." };
  setPin(db, next);
  await startSession();
  revalidatePath("/", "layout");
  return { ok: true, message: "PIN saved. TAC-LOG will ask for it each time it opens." };
}

export async function removePin(current: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const db = getDb();
  const res = checkPin(db, current);
  if (!res.ok) return { ok: false, error: res.waitSeconds ? `Too many wrong attempts. Wait ${res.waitSeconds}s.` : "Current PIN is wrong." };
  clearPin(db);
  revalidatePath("/", "layout");
  return { ok: true, message: "PIN removed." };
}

export async function saveAutoLock(minutes: number) {
  updateSettings(getDb(), { autoLockMinutes: minutes });
  revalidatePath("/", "layout");
  return { ok: true };
}
