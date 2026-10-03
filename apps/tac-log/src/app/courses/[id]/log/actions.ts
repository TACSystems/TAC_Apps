"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loadCourse } from "@core/lib/cof";
import { adjustShots, parseRangeLogForm, writeZoneCounts } from "@/lib/range-log";
import { assignEntry } from "@/lib/sessions";
import { moveRunEntriesToSession } from "@/lib/course-runs";
import { flash } from "@core/lib/flash";

export async function submitRangeLog(cofId: string, formData: FormData) {
  const db = getDb();
  const course = loadCourse(db, cofId);
  if (!course || !course.target) redirect(`/courses/${cofId}`);

  const parsed = parseRangeLogForm(db, formData, course.target.zones, course.effective_total_rounds, course.scorecard);
  const logId = randomUUID();
  const runId = typeof formData.get("run_id") === "string" ? String(formData.get("run_id")) : null;

  db.transaction(() => {
    db.prepare(
      `insert into range_log
        (id, cof_id, firearm_id, date, range_location, weapon_used, caliber, grain, ammo_lot,
         weather_conditions, rounds_fired, rounds_counted, total_points, final_score_percent,
         grader_name, passing_score_percent, custom_fields_json, notes, ammo_type, ammo_grain, ammo_manufacturer)
       values (@id, @cof_id, @firearm_id, @date, @range_location, @weapon_used, @caliber, @grain, @ammo_lot,
         @weather_conditions, @rounds_fired, @rounds_counted, @total_points, @final_score_percent,
         @grader_name, @passing_score_percent, @custom_fields_json, @notes, @ammo_type, @ammo_grain, @ammo_manufacturer)`
    ).run({ id: logId, cof_id: cofId, passing_score_percent: course.passing_score_percent, ...parsed.values });
    writeZoneCounts(db, logId, parsed.zoneRows);
    const sessionId = assignEntry(db, "range_log", logId);
    if (runId) {
      // The run already posted its rounds, firearm by firearm, when its tally
      // was accepted. Counting them again here would double every figure.
      db.prepare(`update range_log set run_id = ? where id = ?`).run(runId, logId);
      const row = db.prepare(`select date, range_location from range_log where id = ?`).get(logId) as {
        date: string;
        range_location: string | null;
      };
      moveRunEntriesToSession(db, runId, { id: sessionId, date: row.date, location: row.range_location });
    } else {
      adjustShots(db, parsed.firearmId, parsed.roundsFired);
    }
  })();

  await flash("Course run saved.");

  revalidatePath("/range-log");
  revalidatePath("/ammo");
  revalidatePath("/stats");
  revalidatePath("/");
  if (parsed.firearmId) revalidatePath(`/inventory/${parsed.firearmId}`);
  redirect(`/range-log/${logId}`);
}
