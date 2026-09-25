import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { loadCourse } from "@core/lib/cof";
import { maxPointsFor, type ZoneDef } from "@core/lib/cof-shared";

export type ScoreRun = {
  id: string;
  class_id: string;
  student_id: string;
  cof_id: string;
  attempt: number;
  kind: "qual" | "remedial";
  date: string;
  firearm_desc: string | null;
  caliber: string | null;
  rounds_counted: number | null;
  total_points: number | null;
  final_score_percent: number | null;
  passing_score_percent: number | null;
  passed: number;
  scored_by: string | null;
  notes: string | null;
  created_at: string;
};

export type ZoneCount = { zone_label: string; value: number; counted: number };

export type GridEntry = {
  enrollment_id: string;
  student_id: string;
  last_name: string;
  first_name: string;
  relay: number | null;
  lane: number | null;
  run: ScoreRun | null;
  counts: Record<string, number>;
};

/** Zones for a course, highest value first — the order they appear across the grid. */
export function courseZones(db: Database.Database, cofId: string): ZoneDef[] {
  const course = loadCourse(db, cofId);
  return course?.target?.zones ?? [];
}

export function courseMeta(db: Database.Database, cofId: string) {
  const course = loadCourse(db, cofId);
  if (!course) return null;
  const zones = course.target?.zones ?? [];
  const totalRounds = course.total_rounds ?? 0;
  return {
    id: course.id,
    code: course.code,
    name: course.name,
    zones,
    totalRounds,
    passing: course.passing_score_percent ?? null,
    maxPoints: maxPointsFor(totalRounds, zones),
  };
}

/**
 * Points and percent for one student's zone counts. Percent is against the
 * course maximum, the same basis TAC-LOG scores a personal run on.
 */
export function scoreFromCounts(counts: Record<string, number>, zones: ZoneDef[], maxPoints: number) {
  let points = 0;
  let rounds = 0;
  for (const z of zones) {
    const n = Math.max(0, Math.round(counts[z.zone_label] ?? 0));
    points += n * z.value;
    rounds += n;
  }
  const percent = maxPoints > 0 ? Math.round((points / maxPoints) * 1000) / 10 : null;
  return { points, rounds, percent };
}

export function latestAttempt(db: Database.Database, classId: string, studentId: string, cofId: string) {
  const row = db
    .prepare(
      `select coalesce(max(attempt), 0) as n from score_runs
        where class_id = ? and student_id = ? and cof_id = ?`
    )
    .get(classId, studentId, cofId) as { n: number };
  return row.n;
}

export function runsForClassCourse(db: Database.Database, classId: string, cofId: string, attempt: number) {
  return db
    .prepare(
      `select * from score_runs where class_id = ? and cof_id = ? and attempt = ?`
    )
    .all(classId, cofId, attempt) as ScoreRun[];
}

export function countsForRun(db: Database.Database, runId: string) {
  const rows = db
    .prepare(`select zone_label, value, counted from score_zone_counts where run_id = ?`)
    .all(runId) as ZoneCount[];
  const map: Record<string, number> = {};
  for (const r of rows) map[r.zone_label] = r.counted;
  return map;
}

export type SaveRunInput = {
  studentId: string;
  counts: Record<string, number>;
  firearmDesc?: string | null;
  caliber?: string | null;
  notes?: string | null;
};

/**
 * Saves a whole relay in one transaction. A student with no counts entered is
 * skipped rather than stored as a zero, so an unshot lane never reads as a fail.
 */
export function saveRelayScores(
  db: Database.Database,
  opts: {
    classId: string;
    cofId: string;
    date: string;
    attempt: number;
    kind: "qual" | "remedial";
    scoredBy: string | null;
    entries: SaveRunInput[];
  }
) {
  const meta = courseMeta(db, opts.cofId);
  if (!meta) return { saved: 0, skipped: 0 };

  const del = db.prepare(
    `delete from score_runs where class_id = ? and student_id = ? and cof_id = ? and attempt = ?`
  );
  const insRun = db.prepare(
    `insert into score_runs (id, class_id, student_id, cof_id, attempt, kind, date, firearm_desc,
       caliber, rounds_counted, total_points, final_score_percent, passing_score_percent, passed,
       scored_by, notes)
     values (@id, @class_id, @student_id, @cof_id, @attempt, @kind, @date, @firearm_desc,
       @caliber, @rounds_counted, @total_points, @final_score_percent, @passing_score_percent, @passed,
       @scored_by, @notes)`
  );
  const insZone = db.prepare(
    `insert into score_zone_counts (id, run_id, zone_label, value, counted) values (?, ?, ?, ?, ?)`
  );

  let saved = 0;
  let skipped = 0;

  db.transaction(() => {
    for (const e of opts.entries) {
      const anyEntered = meta.zones.some((z) => (e.counts[z.zone_label] ?? 0) > 0);
      if (!anyEntered) {
        skipped += 1;
        continue;
      }
      const { points, rounds, percent } = scoreFromCounts(e.counts, meta.zones, meta.maxPoints);
      const passed = meta.passing != null && percent != null ? (percent >= meta.passing ? 1 : 0) : 0;
      const id = randomUUID();

      del.run(opts.classId, e.studentId, opts.cofId, opts.attempt);
      insRun.run({
        id,
        class_id: opts.classId,
        student_id: e.studentId,
        cof_id: opts.cofId,
        attempt: opts.attempt,
        kind: opts.kind,
        date: opts.date,
        firearm_desc: e.firearmDesc ?? null,
        caliber: e.caliber ?? null,
        rounds_counted: rounds,
        total_points: points,
        final_score_percent: percent,
        passing_score_percent: meta.passing,
        passed,
        scored_by: opts.scoredBy,
        notes: e.notes ?? null,
      });
      for (const z of meta.zones) {
        insZone.run(randomUUID(), id, z.zone_label, z.value, Math.max(0, Math.round(e.counts[z.zone_label] ?? 0)));
      }
      saved += 1;
    }
  })();

  return { saved, skipped };
}

export function deleteRun(db: Database.Database, id: string) {
  return db.prepare(`delete from score_runs where id = ?`).run(id).changes > 0;
}

export function classResults(db: Database.Database, classId: string, cofId: string) {
  return db
    .prepare(
      `select r.*, s.last_name, s.first_name, e.relay, e.lane
         from score_runs r
         join students s on s.id = r.student_id
         left join class_enrollment e on e.class_id = r.class_id and e.student_id = r.student_id
        where r.class_id = ? and r.cof_id = ?
        order by coalesce(e.relay, 9999), coalesce(e.lane, 9999), s.last_name`
    )
    .all(classId, cofId) as (ScoreRun & {
    last_name: string;
    first_name: string;
    relay: number | null;
    lane: number | null;
  })[];
}
