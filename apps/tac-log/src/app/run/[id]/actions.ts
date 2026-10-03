"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { isCombinedArms } from "@core/lib/course-categories";
import type { RunSummary } from "@core/components/RunCourse";
import { adjustShots } from "@/lib/range-log";
import { assignEntry } from "@/lib/sessions";
import { todayISO } from "@/lib/settings-shared";
import { flash } from "@core/lib/flash";

/**
 * The run is the record. A combined arms run is fired with more than one
 * firearm and range_log holds exactly one, so the score — when there is one —
 * points at the run rather than the run being bent into a score's shape.
 *
 * Rounds are posted here, at accept, not when a score is later submitted.
 * Shoot a course and never score it and the counts are still right.
 */
export async function finishRun(cofId: string, picks: Record<string, string>, summary: RunSummary) {
  const db = getDb();
  const course = loadCourse(db, cofId);
  if (!course) redirect("/courses");

  // Dry fire leaves nothing behind, by design.
  if (summary.dryFire) {
    await flash("Dry fire run — nothing recorded.");
    redirect(`/courses/${cofId}`);
  }

  const runId = randomUUID();
  const date = todayISO();
  const combinedArms = isCombinedArms(course.categories);
  const entryLabel = `${combinedArms ? "Combined Arms Course" : "Course run"} — ${course.code || course.name}`;
  const fired = summary.outcomes.filter((o) => !o.skipped).length;
  const skipped = summary.outcomes.filter((o) => o.skipped).length;
  const reruns = summary.outcomes.reduce((n, o) => n + o.reruns, 0);

  db.transaction(() => {
    db.prepare(
      `insert into course_runs
         (id, cof_id, date, elapsed_seconds, combined_arms, dry_fire, strings_fired, strings_skipped,
          reruns, corrected, options_json)
       values (@id, @cof_id, @date, @elapsed_seconds, @combined_arms, 0, @strings_fired, @strings_skipped,
          @reruns, @corrected, @options_json)`
    ).run({
      id: runId,
      cof_id: cofId,
      date,
      elapsed_seconds: summary.courseSeconds,
      combined_arms: combinedArms ? 1 : 0,
      strings_fired: fired,
      strings_skipped: skipped,
      reruns,
      corrected: summary.corrected ? 1 : 0,
      options_json: Object.keys(summary.options).length ? JSON.stringify(summary.options) : null,
    });

    const addWeapon = db.prepare(
      `insert into course_run_firearms (id, run_id, sort_order, weapon, firearm_id, rounds)
       values (?, ?, ?, ?, ?, ?)`
    );
    const addRounds = db.prepare(
      `insert into rounds_fired_log (id, firearm_id, date, rounds, deduct_from_ammo, notes, run_id)
       values (?, ?, ?, ?, 0, ?, ?)`
    );

    summary.byWeapon.forEach((t, i) => {
      const pick = picks[t.weapon ?? ""] ?? "none";
      const firearmId = pick && pick !== "none" ? pick : null;
      addWeapon.run(randomUUID(), runId, i, t.weapon, firearmId, t.rounds);
      if (!firearmId || t.rounds <= 0) return;
      const entryId = randomUUID();
      addRounds.run(entryId, firearmId, date, t.rounds, entryLabel, runId);
      assignEntry(db, "rounds_fired_log", entryId);
      adjustShots(db, firearmId, t.rounds);
    });

    const session = db
      .prepare(`select session_id from rounds_fired_log where run_id = ? and session_id is not null limit 1`)
      .get(runId) as { session_id: string } | undefined;
    if (session) db.prepare(`update course_runs set session_id = ? where id = ?`).run(session.session_id, runId);
  })();

  revalidatePath("/range-log");
  revalidatePath("/stats");
  revalidatePath("/");
  for (const id of Object.values(picks)) if (id && id !== "none") revalidatePath(`/inventory/${id}`);

  redirect(`/courses/${cofId}/log?run=${runId}`);
}
