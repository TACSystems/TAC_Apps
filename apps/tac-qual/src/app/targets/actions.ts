"use server";

import { revalidatePath } from "next/cache";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { saveTargetType, type ZoneDef } from "@core/lib/cof";
import { text, number as num } from "@core/lib/forms";

/** Zones arrive as parallel label/value rows from the form. */
function readZones(formData: FormData) {
  const labels = formData.getAll("zone_label").map((v) => String(v).trim());
  const values = formData.getAll("zone_value").map((v) => Number(v));
  return labels
    .map((zone_label, i) => ({ zone_label, value: values[i] }))
    .filter((z) => z.zone_label !== "" && Number.isFinite(z.value));
}

export async function saveTarget(formData: FormData) {
  const db = getDb();
  const name = text(formData, "name", 80);
  if (!name) {
    await flash("Give the target type a name.", "error");
    return;
  }
  const zones = readZones(formData);
  if (zones.length === 0) {
    await flash("Add at least one scoring zone.", "error");
    return;
  }
  try {
    saveTargetType(db, {
      id: text(formData, "id", 40),
      name,
      description: text(formData, "description", 300),
      zones,
    });
    await flash("Target type saved.");
  } catch (e) {
    await flash(e instanceof Error ? e.message : "That target type could not be saved.", "error");
  }
  revalidatePath("/targets");
  revalidatePath("/courses");
}

export async function removeTarget(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  const inUse = db.prepare(`select count(*) as n from courses_of_fire where target_type_id = ?`).get(id) as {
    n: number;
  };
  if (inUse.n > 0) {
    await flash(`That target type is used by ${inUse.n} course${inUse.n === 1 ? "" : "s"}.`, "error");
  } else {
    db.prepare(`delete from target_types where id = ?`).run(id);
    await flash("Target type deleted.");
  }
  revalidatePath("/targets");
}

/** Sets how a course is scored: which target, and the percent needed to pass. */
export async function saveCourseScoring(formData: FormData) {
  const db = getDb();
  const cofId = String(formData.get("cof_id") ?? "");
  const targetId = text(formData, "target_type_id", 40);
  const passing = num(formData, "passing_score_percent", { min: 0, max: 100 });
  const rounds = num(formData, "total_rounds", { min: 0, max: 100000 });

  const targetName = targetId
    ? ((db.prepare(`select name from target_types where id = ?`).get(targetId) as { name: string } | undefined)?.name ??
      null)
    : null;

  db.prepare(
    `update courses_of_fire set target_type_id = ?, target_type = ?, passing_score_percent = ?, total_rounds = ?
      where id = ?`
  ).run(targetId, targetName, passing, rounds, cofId);

  await flash("Scoring saved.");
  revalidatePath(`/courses/${cofId}`);
  revalidatePath("/courses");
}

/** Used by the shared TargetTypeEditor, which posts a whole target at once. */
export async function saveTargetTypeAction(payload: {
  id?: string | null;
  name: string;
  description: string | null;
  zones: ZoneDef[];
}): Promise<{ error: string } | { id: string }> {
  try {
    const id = saveTargetType(getDb(), {
      id: payload.id || null,
      name: String(payload.name ?? ""),
      description: payload.description ? String(payload.description).trim() || null : null,
      zones: Array.isArray(payload.zones) ? payload.zones : [],
    });
    revalidatePath("/targets");
    revalidatePath("/courses");
    return { id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the target type." };
  }
}
