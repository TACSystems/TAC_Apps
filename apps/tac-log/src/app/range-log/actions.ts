"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { adjustShots, parseRangeLogForm, writeZoneCounts } from "@/lib/range-log";
import type { RangeLog, RangeLogZoneCount } from "@/lib/db/types";
import { assignEntry, pruneSessions } from "@/lib/sessions";
import { flash } from "@core/lib/flash";

function refresh(firearmIds: (string | null)[]) {
  revalidatePath("/range-log");
  revalidatePath("/ammo");
  revalidatePath("/stats");
  revalidatePath("/");
  for (const id of firearmIds) if (id) revalidatePath(`/inventory/${id}`);
}

export async function updateRangeLog(logId: string, formData: FormData) {
  const db = getDb();
  const old = db.prepare(`select * from range_log where id = ?`).get(logId) as RangeLog | undefined;
  if (!old) redirect("/range-log");
  const zones = (
    db.prepare(`select * from range_log_zone_counts where range_log_id = ? order by value desc`).all(logId) as RangeLogZoneCount[]
  ).map((z) => ({ zone_label: z.zone_label, value: z.value }));
  const course = old.cof_id ? loadCourse(db, old.cof_id) : null;
  const total = course?.effective_total_rounds ?? Number(formData.get("rounds_fired") || old.rounds_fired || 0);
  const parsed = parseRangeLogForm(db, formData, zones, total, course?.scorecard ?? null);

  const passingRaw = String(formData.get("passing_score_percent") ?? "").trim();
  const passing = passingRaw === "" ? null : Math.min(100, Math.max(0, Number(passingRaw)));

  db.transaction(() => {
    db.prepare(
      `update range_log set firearm_id = @firearm_id, date = @date, range_location = @range_location,
         weapon_used = coalesce(@weapon_used, weapon_used), caliber = @caliber, grain = @grain, ammo_lot = @ammo_lot,
         weather_conditions = @weather_conditions, rounds_fired = @rounds_fired, rounds_counted = @rounds_counted,
         total_points = @total_points, final_score_percent = @final_score_percent, grader_name = @grader_name,
         passing_score_percent = @passing_score_percent, custom_fields_json = @custom_fields_json, notes = @notes,
         ammo_type = @ammo_type, ammo_grain = @ammo_grain, ammo_manufacturer = @ammo_manufacturer
       where id = @id`
    ).run({ id: logId, passing_score_percent: Number.isFinite(passing) ? passing : null, ...parsed.values });
    writeZoneCounts(db, logId, parsed.zoneRows);
    const moved =
      old.date !== parsed.values.date ||
      (old.range_location ?? "").trim().toLowerCase() !== (parsed.values.range_location ?? "").trim().toLowerCase();
    if (moved || !old.session_id) assignEntry(db, "range_log", logId);
    adjustShots(db, old.firearm_id, -(old.rounds_fired ?? 0));
    adjustShots(db, parsed.firearmId, parsed.roundsFired);
  })();

  await flash("Course run saved.");

  refresh([old.firearm_id, parsed.firearmId]);
  redirect(`/range-log/${logId}`);
}

export async function deleteRangeLog(logId: string) {
  const db = getDb();
  const old = db.prepare(`select firearm_id, rounds_fired, session_id from range_log where id = ?`).get(logId) as
    | Pick<RangeLog, "firearm_id" | "rounds_fired" | "session_id">
    | undefined;
  if (old) {
    db.transaction(() => {
      db.prepare(`delete from range_log where id = ?`).run(logId);
      adjustShots(db, old.firearm_id, -(old.rounds_fired ?? 0));
      pruneSessions(db);
    })();
    await flash("Course run deleted.");
    refresh([old.firearm_id]);
    if (old.session_id && db.prepare(`select 1 from range_sessions where id = ?`).get(old.session_id)) {
      redirect(`/range-log/session/${old.session_id}`);
    }
  }
  redirect("/range-log");
}
