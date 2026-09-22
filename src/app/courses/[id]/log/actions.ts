"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Firearm } from "@/lib/db/types";
import { loadCourse, maxPointsFor, RANGE_LOG_FIELD_COLUMNS } from "@/lib/cof";

function str(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function submitRangeLog(cofId: string, formData: FormData) {
  const db = getDb();
  const course = loadCourse(db, cofId);
  if (!course || !course.target) redirect(`/courses/${cofId}`);

  const counts = new Map<string, number>();
  for (const z of course.target.zones) {
    counts.set(z.zone_label, Math.max(0, Number(formData.get(`zone:${z.zone_label}`) || 0)));
  }

  let totalPoints = 0;
  let roundsCounted = 0;
  const zoneRows = course.target.zones.map((z) => {
    const counted = counts.get(z.zone_label) ?? 0;
    totalPoints += z.value * counted;
    roundsCounted += counted;
    return { zone_label: z.zone_label, value: z.value, counted };
  });

  const maxPossible = maxPointsFor(course.effective_total_rounds, course.target.zones);
  const finalScorePercent = maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 1000) / 10 : null;
  const roundsFired = Number(formData.get("rounds_fired") || 0);

  const firearmId = str(formData.get("firearm_id"));
  let caliber = str(formData.get("field:caliber"));
  if (!caliber && firearmId) {
    const firearm = db.prepare(`select caliber from firearms where id = ?`).get(firearmId) as
      | Pick<Firearm, "caliber">
      | undefined;
    caliber = firearm?.caliber ?? null;
  }

  const columnKeys = new Set<string>(RANGE_LOG_FIELD_COLUMNS);
  const custom: Record<string, string> = {};
  for (const f of [...course.scorecard.header, ...course.scorecard.signoff]) {
    if (f.printOnly || columnKeys.has(f.key)) continue;
    const v = str(formData.get(`field:${f.key}`));
    if (v) custom[f.key] = v;
  }

  const grain = str(formData.get("field:grain"));
  const logId = randomUUID();

  db.prepare(
    `insert into range_log
      (id, cof_id, firearm_id, date, range_location, weapon_used, caliber, grain, ammo_lot,
       weather_conditions, rounds_fired, rounds_counted, total_points, final_score_percent,
       grader_name, passing_score_percent, custom_fields_json, notes)
     values (@id, @cof_id, @firearm_id, @date, @range_location, @weapon_used, @caliber, @grain, @ammo_lot,
       @weather_conditions, @rounds_fired, @rounds_counted, @total_points, @final_score_percent,
       @grader_name, @passing_score_percent, @custom_fields_json, @notes)`
  ).run({
    id: logId,
    cof_id: cofId,
    firearm_id: firearmId,
    date: String(formData.get("date")),
    range_location: str(formData.get("field:range_location")),
    weapon_used: str(formData.get("field:weapon_used")),
    caliber,
    grain: grain && Number.isFinite(Number(grain)) ? Number(grain) : null,
    ammo_lot: str(formData.get("field:ammo_lot")),
    weather_conditions: str(formData.get("field:weather_conditions")),
    rounds_fired: roundsFired || null,
    rounds_counted: roundsCounted || null,
    total_points: totalPoints,
    final_score_percent: finalScorePercent,
    grader_name: str(formData.get("field:grader_name")),
    passing_score_percent: course.passing_score_percent,
    custom_fields_json: Object.keys(custom).length ? JSON.stringify(custom) : null,
    notes: str(formData.get("notes")),
  });

  const insertZone = db.prepare(
    `insert into range_log_zone_counts (id, range_log_id, zone_label, value, counted)
     values (@id, @range_log_id, @zone_label, @value, @counted)`
  );
  db.transaction(() => {
    for (const z of zoneRows) insertZone.run({ id: randomUUID(), range_log_id: logId, ...z });
  })();

  if (firearmId && roundsFired) {
    db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(roundsFired, firearmId);
  }

  revalidatePath("/range-log");
  revalidatePath("/stats");
  revalidatePath("/");
  if (firearmId) revalidatePath(`/inventory/${firearmId}`);
  redirect(`/range-log/${logId}`);
}
