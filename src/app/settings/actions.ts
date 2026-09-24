"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { updateSettings, type AppSettings } from "@/lib/settings";
import { markWhatsNewSeen } from "@/lib/changelog";
import { saveBackupPassword as storeBackupPassword, savedBackupKey } from "@/lib/backup";
import {
  folderProblem,
  runAutoBackupNow,
  saveAutoBackup as storeAutoBackup,
  type AutoBackupFrequency,
} from "@/lib/auto-backup";
import { isEncrypted } from "@/lib/security-state";

type Result = { ok: boolean; error?: string; message?: string };

export async function saveSettingsForm(formData: FormData) {
  const has = (k: string) => formData.has(k);
  const get = (k: string) => String(formData.get(k) ?? "");
  const checkboxes = new Set(formData.getAll("__cb").map(String));
  const patch: Record<string, unknown> = {};
  const text = ["defaultShooterName", "defaultGraderName", "defaultRangeLocation", "currencySymbol", "defaultAmmoManufacturer", "defaultAmmoType", "firearmLabel", "dateFormat", "textSize"];
  const nums = ["dueSoonPercent", "lowAmmoPercent", "docWarnDays", "docUrgentDays"];
  const optNums = ["defaultCleanIntervalRounds", "defaultCleanIntervalDays"];
  for (const k of text) if (has(k)) patch[k] = get(k);
  for (const k of nums) if (has(k)) patch[k] = Number(get(k));
  for (const k of optNums) if (has(k)) patch[k] = get(k) ? Number(get(k)) : null;
  if (has("theme")) patch.theme = get("theme") === "light" ? "light" : "dark";
  for (const k of checkboxes) patch[k] = formData.get(k) === "on";
  updateSettings(getDb(), patch as Partial<AppSettings>);
  revalidatePath("/", "layout");
  const back = get("__return");
  const section = get("__section");
  const target = back.startsWith("/") && !back.startsWith("//") ? back : "/settings";
  redirect(`${target}?saved=${encodeURIComponent(section)}`);
}

export async function dismissWhatsNew() {
  markWhatsNewSeen(getDb());
  revalidatePath("/", "layout");
}

export async function setBackupPassword(password: string, confirm: string): Promise<Result> {
  const pw = String(password ?? "");
  if (pw.length < 8) return { ok: false, error: "The backup password must be at least 8 characters." };
  if (pw !== String(confirm ?? "")) return { ok: false, error: "The two entries don't match." };
  storeBackupPassword(getDb(), pw);
  revalidatePath("/settings");
  return { ok: true, message: "Backup password saved. Every backup from now on is encrypted with it." };
}

export async function clearBackupPassword(): Promise<Result> {
  if (isEncrypted()) return { ok: false, error: "Database encryption is on, so backups must stay password-protected." };
  storeBackupPassword(getDb(), null);
  revalidatePath("/settings");
  return { ok: true, message: "Backup password removed. New backups are plain .zip files." };
}

export async function saveAutoBackupSettings(frequency: string, folder: string, keep: number): Promise<Result> {
  const db = getDb();
  const f = (["off", "daily", "weekly"].includes(frequency) ? frequency : "off") as AutoBackupFrequency;
  const dir = String(folder ?? "").trim();
  if (f !== "off") {
    const problem = folderProblem(dir);
    if (problem) return { ok: false, error: problem };
    if (isEncrypted() && !savedBackupKey(db)) {
      return { ok: false, error: "Set a backup password first. Database encryption is on, so backups must be encrypted." };
    }
  }
  storeAutoBackup(db, { frequency: f, folder: dir, keep: Math.min(100, Math.max(1, Math.round(Number(keep) || 10))) });
  revalidatePath("/settings");
  return { ok: true, message: f === "off" ? "Automatic backups are off." : "Automatic backups saved." };
}

export async function backupNow(): Promise<Result> {
  const res = runAutoBackupNow(getDb());
  revalidatePath("/settings");
  return res.ok ? { ok: true, message: `Backup written: ${res.file}` } : { ok: false, error: res.error };
}
