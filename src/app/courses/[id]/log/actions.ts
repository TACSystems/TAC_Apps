"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loadCourse } from "@/lib/cof";
import { adjustShots, parseRangeLogForm, writeZoneCounts } from "@/lib/range-log";

export async function submitRangeLog(cofId: string, formData: FormData) {
  const db = getDb();
  const course = loadCourse(db, cofId);
  if (!course || !course.target) redirect(`/courses/${cofId}`);

  const parsed = parseRangeLogForm(db, formData, course.target.zones, course.effective_total_rounds, course.scorecard);
  const logId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `insert into range_log
        (id, cof_id, firearm_id, date, range_location, weapon_used, caliber, grain, ammo_lot,
         weather_conditions, rounds_fired, rounds_counted, total_points, final_score_percent,
         grader_name, passing_score_percent, custom_fields_json, notes)
       values (@id, @cof_id, @firearm_id, @date, @range_location, @weapon_used, @caliber, @grain, @ammo_lot,
         @weather_conditions, @rounds_fired, @rounds_counted, @total_points, @final_score_percent,
         @grader_name, @passing_score_percent, @custom_fields_json, @notes)`
    ).run({ id: logId, cof_id: cofId, passing_score_percent: course.passing_score_percent, ...parsed.values });
    writeZoneCounts(db, logId, parsed.zoneRows);
    adjustShots(db, parsed.firearmId, parsed.roundsFired);
  })();

  revalidatePath("/range-log");
  revalidatePath("/stats");
  revalidatePath("/");
  if (parsed.firearmId) revalidatePath(`/inventory/${parsed.firearmId}`);
  redirect(`/range-log/${logId}`);
}
