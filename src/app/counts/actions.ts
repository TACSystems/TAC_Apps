"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  addCounter,
  correctAmmoCount,
  correctAmmoLine,
  type AmmoLineKey,
  correctFirearmCount,
  deleteAdjustment,
  deleteCounter,
  resetCounter,
  safetyCopy,
} from "@/lib/counts";
import { runAutoBackupNow, getAutoBackup } from "@/lib/auto-backup";

type Res = { ok: boolean; error?: string; message?: string };

function refresh(firearmId?: string | null) {
  revalidatePath("/", "layout");
  if (firearmId) revalidatePath(`/inventory/${firearmId}`);
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function correctFirearm(firearmId: string, value: number, note: string): Promise<Res> {
  const target = num(value);
  if (target == null || target < 0) return { ok: false, error: "Enter the correct number of rounds (0 or more)." };
  const id = correctFirearmCount(getDb(), firearmId, target, String(note ?? "").trim() || null);
  refresh(firearmId);
  return { ok: true, message: id ? `Rounds fired set to ${Math.round(target).toLocaleString()}.` : "Already at that number." };
}

export async function correctAmmo(caliber: string, value: number, note: string): Promise<Res> {
  const target = num(value);
  if (target == null || target < 0) return { ok: false, error: "Enter the counted number of rounds (0 or more)." };
  const id = correctAmmoCount(getDb(), String(caliber), target, String(note ?? "").trim() || null);
  refresh();
  return { ok: true, message: id ? `${caliber} on hand set to ${Math.round(target).toLocaleString()}.` : "Already at that number." };
}

export async function correctAmmoLineAction(key: AmmoLineKey, value: number, note: string): Promise<Res> {
  const target = num(value);
  if (target == null || target < 0) return { ok: false, error: "Enter the counted number of rounds (0 or more)." };
  const k = {
    caliber: String(key?.caliber ?? ""),
    ammo_type: key?.ammo_type ?? null,
    grain: key?.grain ?? null,
    manufacturer: key?.manufacturer ?? null,
  };
  if (!k.caliber) return { ok: false, error: "Missing caliber." };
  const id = correctAmmoLine(getDb(), k, target, String(note ?? "").trim() || null);
  refresh();
  return { ok: true, message: id ? `Set to ${Math.round(target).toLocaleString()}.` : "Already at that number." };
}

export async function removeAdjustment(id: string) {
  const adj = deleteAdjustment(getDb(), id);
  refresh(adj?.firearm_id);
}

export async function createCounter(firearmId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  addCounter(getDb(), firearmId, {
    name,
    startDate: String(formData.get("start_date") || new Date().toISOString().slice(0, 10)),
    roundsSince: num(formData.get("rounds_since")) ?? 0,
    interval: num(formData.get("interval_rounds")) || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  refresh(firearmId);
}

export async function replaceCounter(firearmId: string, counterId: string) {
  resetCounter(getDb(), counterId);
  refresh(firearmId);
}

export async function removeCounter(firearmId: string, counterId: string) {
  deleteCounter(getDb(), counterId);
  refresh(firearmId);
}

export async function bulkCorrect(
  kind: "firearm" | "ammo",
  entries: { key: string; value: number }[],
  confirm: string
): Promise<Res> {
  const list = (Array.isArray(entries) ? entries : []).filter((e) => e && num(e.value) != null && Number(e.value) >= 0);
  if (!list.length) return { ok: false, error: "Nothing to change." };
  if (String(confirm).trim().toUpperCase() !== "RESET") return { ok: false, error: 'Type RESET to confirm.' };
  const db = getDb();
  const copy = safetyCopy(db, kind === "firearm" ? "firearm-count-reset" : "ammo-count-reset");
  if (getAutoBackup(db).folder) {
    try {
      runAutoBackupNow(db);
    } catch {}
  }
  let changed = 0;
  db.transaction(() => {
    for (const e of list) {
      const id =
        kind === "firearm"
          ? correctFirearmCount(db, e.key, Number(e.value), "Bulk correction")
          : correctAmmoCount(db, e.key, Number(e.value), "Bulk correction");
      if (id) changed += 1;
    }
  })();
  refresh();
  return { ok: true, message: `Updated ${changed} ${kind === "firearm" ? "firearm" : "caliber"} count${changed === 1 ? "" : "s"}. A safety copy was saved first (${copy.split(/[\\/]/).pop()}).` };
}
