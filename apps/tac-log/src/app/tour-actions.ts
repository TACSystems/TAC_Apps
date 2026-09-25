"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSettings, updateSettings, type AppSettings } from "@/lib/settings";
import { setPin } from "@/lib/security";
import { securityMode } from "@/lib/security-state";

export async function finishTour() {
  updateSettings(getDb(), { tourStatus: "done" });
  revalidatePath("/", "layout");
}

export async function saveSetup(input: {
  name: string;
  dateFormat: string;
  firearmLabel: string;
  pin?: string;
  pinConfirm?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const name = String(input?.name ?? "").trim().slice(0, 40);
  if (input?.pin) {
    if (securityMode() !== "none") return { ok: false, error: "A PIN or password is already set." };
    const res = setPin("", String(input.pin), String(input.pinConfirm ?? ""));
    if (!res.ok) return { ok: false, error: res.error };
  }
  const current = getSettings(db);
  const patch: Partial<AppSettings> = {
    userName: name,
    dateFormat: input.dateFormat as AppSettings["dateFormat"],
    firearmLabel: input.firearmLabel as AppSettings["firearmLabel"],
  };
  if (name && !current.defaultShooterName) patch.defaultShooterName = name;
  updateSettings(db, patch);
  revalidatePath("/", "layout");
  return { ok: true };
}
