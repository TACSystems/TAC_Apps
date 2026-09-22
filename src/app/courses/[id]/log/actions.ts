"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Firearm } from "@/lib/db/types";

export async function submitRangeLog(cofId: string, formData: FormData) {
  const db = getDb();

  const zoneLabels = formData.getAll("zone_label") as string[];
  const zoneValues = formData.getAll("zone_value") as string[];
  const zoneCounts = formData.getAll("zone_counted") as string[];

  let totalPoints = 0;
  let roundsCounted = 0;
  const zoneRows = zoneLabels.map((label, i) => {
    const value = Number(zoneValues[i] || 0);
    const counted = Number(zoneCounts[i] || 0);
    totalPoints += value * counted;
    roundsCounted += counted;
    return { zone_label: label, value, counted };
  });

  const roundsFired = Number(formData.get("rounds_fired") || 0);
  const maxPossible = Number(formData.get("max_points") || 0);
  const finalScorePercent =
    maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 1000) / 10 : null;

  const firearmId = (formData.get("firearm_id") as string) || null;
  let caliber: string | null = null;
  if (firearmId) {
    const firearm = db.prepare(`select caliber from firearms where id = ?`).get(firearmId) as
      | Pick<Firearm, "caliber">
      | undefined;
    caliber = firearm?.caliber ?? null;
  }

  const logId = randomUUID();

  db.prepare(
    `insert into range_log
      (id, cof_id, firearm_id, date, range_location, weapon_used, caliber, grain, ammo_lot,
       weather_conditions, rounds_fired, rounds_counted, total_points, final_score_percent,
       grader_name, notes)
     values (@id, @cof_id, @firearm_id, @date, @range_location, @weapon_used, @caliber, @grain, @ammo_lot,
       @weather_conditions, @rounds_fired, @rounds_counted, @total_points, @final_score_percent,
       @grader_name, @notes)`
  ).run({
    id: logId,
    cof_id: cofId,
    firearm_id: firearmId,
    date: String(formData.get("date")),
    range_location: (formData.get("range_location") as string) || null,
    weapon_used: (formData.get("weapon_used") as string) || null,
    caliber,
    grain: formData.get("grain") ? Number(formData.get("grain")) : null,
    ammo_lot: (formData.get("ammo_lot") as string) || null,
    weather_conditions: (formData.get("weather_conditions") as string) || null,
    rounds_fired: roundsFired || null,
    rounds_counted: roundsCounted || null,
    total_points: totalPoints,
    final_score_percent: finalScorePercent,
    grader_name: (formData.get("grader_name") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  const insertZone = db.prepare(
    `insert into range_log_zone_counts (id, range_log_id, zone_label, value, counted)
     values (@id, @range_log_id, @zone_label, @value, @counted)`
  );
  const insertAllZones = db.transaction((rows: typeof zoneRows) => {
    for (const z of rows) {
      insertZone.run({ id: randomUUID(), range_log_id: logId, ...z });
    }
  });
  insertAllZones(zoneRows);

  if (firearmId && roundsFired) {
    db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(
      roundsFired,
      firearmId
    );
  }

  revalidatePath("/range-log");
  revalidatePath("/stats");
  if (firearmId) revalidatePath(`/inventory/${firearmId}`);
  redirect(`/range-log/${logId}`);
}
