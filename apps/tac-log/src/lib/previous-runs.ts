import type Database from "better-sqlite3-multiple-ciphers";

export type PastRun = {
  id: string;
  date: string;
  firearm: string | null;
  final_score_percent: number | null;
  passing_score_percent: number | null;
  total_points: number | null;
  rounds_counted: number | null;
  zones: { zone_label: string; counted: number; value: number }[];
};

const SELECT = `select r.id, r.date, r.final_score_percent, r.passing_score_percent,
                       r.total_points, r.rounds_counted,
                       firearm_label(f.make_model, f.nickname) as firearm
                  from range_log r
                  left join firearms f on f.id = r.firearm_id
                 where r.cof_id = ?`;

function withZones(db: Database.Database, row: PastRun | undefined) {
  if (!row) return null;
  row.zones = db
    .prepare(
      `select zone_label, counted, value from range_log_zone_counts
        where range_log_id = ? order by value desc`
    )
    .all(row.id) as PastRun["zones"];
  return row;
}

/**
 * The last run and the best run of this course. Shown on Run Course behind a
 * key, closed by default: seeing your best before a string motivates some
 * people and distracts others, so it is a choice rather than a fixture.
 */
export function previousRuns(db: Database.Database, cofId: string) {
  const last = db.prepare(`${SELECT} order by r.date desc, r.rowid desc limit 1`).get(cofId) as PastRun | undefined;
  const best = db
    .prepare(`${SELECT} and r.final_score_percent is not null order by r.final_score_percent desc limit 1`)
    .get(cofId) as PastRun | undefined;
  return { last: withZones(db, last), best: withZones(db, best) };
}
