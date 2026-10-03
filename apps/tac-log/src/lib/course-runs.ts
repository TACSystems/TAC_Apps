import type Database from "better-sqlite3-multiple-ciphers";
import { fmtSeconds } from "@core/lib/run-clock";
import { pruneSessions } from "@/lib/sessions";

export type CourseRun = {
  id: string;
  cof_id: string | null;
  session_id: string | null;
  date: string;
  elapsed_seconds: number | null;
  paused_seconds: number | null;
  combined_arms: number;
  dry_fire: number;
  strings_fired: number;
  strings_skipped: number;
  reruns: number;
  corrected: number;
  options_json: string | null;
  created_at: string;
};

export type RunFirearm = {
  weapon: string | null;
  firearm_id: string | null;
  label: string | null;
  rounds: number;
};

export function getRun(db: Database.Database, runId: string) {
  return db.prepare(`select * from course_runs where id = ?`).get(runId) as CourseRun | undefined;
}

export function runFirearms(db: Database.Database, runId: string) {
  return db
    .prepare(
      `select w.weapon, w.firearm_id, w.rounds, firearm_label(f.make_model, f.nickname) as label
         from course_run_firearms w
         left join firearms f on f.id = w.firearm_id
        where w.run_id = ?
        order by w.sort_order`
    )
    .all(runId) as RunFirearm[];
}

/**
 * What the scoring form needs to open against an accepted run. A combined arms
 * run names no single firearm on the score row — the run holds them — so
 * `soleFirearmId` is null unless exactly one firearm fired the course.
 */
export function runForScoring(db: Database.Database, runId: string, cofId: string) {
  const run = getRun(db, runId);
  if (!run || run.cof_id !== cofId) return null;
  const all = runFirearms(db, runId);
  const withFirearm = all.filter((f) => f.firearm_id && f.rounds > 0);
  const rounds = all.reduce((n, f) => n + f.rounds, 0);
  return {
    run,
    date: run.date,
    rounds,
    soleFirearmId: withFirearm.length === 1 ? withFirearm[0].firearm_id : null,
    weaponUsed: withFirearm.map((f) => f.label).filter(Boolean).join(" / ") || null,
    fromRun: {
      id: run.id,
      elapsed: run.elapsed_seconds != null ? `${fmtSeconds(run.elapsed_seconds)} elapsed` : "no time recorded",
      combinedArms: run.combined_arms === 1,
      firearms: all.map((f) => ({
        weapon: f.weapon,
        label: f.label ?? "Not recorded",
        rounds: f.rounds,
      })),
    },
  };
}

/**
 * The run posts its rounds before a location is known, so those entries land in
 * whatever session the bare date makes. Scoring the run is where the location
 * arrives, so the run's entries follow the score onto its session rather than
 * leaving one trip split across two.
 */
export function moveRunEntriesToSession(
  db: Database.Database,
  runId: string,
  session: { id: string | null; date: string; location: string | null }
) {
  db.prepare(
    `update rounds_fired_log set session_id = ?, date = ?, range_location = ? where run_id = ?`
  ).run(session.id, session.date, session.location, runId);
  db.prepare(`update course_runs set session_id = ?, date = ? where id = ?`).run(session.id, session.date, runId);
  pruneSessions(db);
}
