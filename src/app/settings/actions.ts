"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { updateSettings, type AppSettings } from "@/lib/settings";

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
  };
  updateSettings(getDb(), patch);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
