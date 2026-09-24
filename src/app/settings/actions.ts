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
  const get = (k: string) => String(formData.get(k) ?? "");
  const patch: Partial<AppSettings> = {
    defaultShooterName: get("defaultShooterName"),
    defaultGraderName: get("defaultGraderName"),
    defaultRangeLocation: get("defaultRangeLocation"),
    defaultCleanIntervalRounds: get("defaultCleanIntervalRounds") ? Number(get("defaultCleanIntervalRounds")) : null,
    defaultCleanIntervalDays: get("defaultCleanIntervalDays") ? Number(get("defaultCleanIntervalDays")) : null,
    dueSoonPercent: Number(get("dueSoonPercent")),
    deductManualRoundsByDefault: formData.get("deductManualRoundsByDefault") === "on",
    lowAmmoPercent: Number(get("lowAmmoPercent")),
    currencySymbol: get("currencySymbol"),
    firearmLabel: get("firearmLabel") as AppSettings["firearmLabel"],
    dateFormat: get("dateFormat") as AppSettings["dateFormat"],
    graderDateFromSession: formData.get("graderDateFromSession") === "on",
    defaultAmmoManufacturer: get("defaultAmmoManufacturer"),
    defaultAmmoType: get("defaultAmmoType"),
    launchReminders: formData.get("launchReminders") === "on",
    docWarnDays: Number(get("docWarnDays")),
    docUrgentDays: Number(get("docUrgentDays")),
  };
  updateSettings(getDb(), patch);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
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
