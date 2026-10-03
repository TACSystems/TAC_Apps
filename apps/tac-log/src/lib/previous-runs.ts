import type Database from "better-sqlite3-multiple-ciphers";
import { firearmMatchesCategories, isCombinedArms } from "@core/lib/course-categories";

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
 * The last run and the best run of this course **with the firearm in hand**,
 * which is the comparison worth seeing. With no firearm chosen the scope
 * widens to the whole course, and the panel says so rather than implying a
 * like-for-like comparison.
 *
 * Shown behind a key and closed by default: seeing your best before a string
 * motivates some people and distracts others, so it is a choice.
 */
export function previousRuns(db: Database.Database, cofId: string, firearmId: string | null) {
  const where = firearmId ? `${SELECT} and r.firearm_id = ?` : SELECT;
  const args = firearmId ? [cofId, firearmId] : [cofId];
  const last = db.prepare(`${where} order by r.date desc, r.rowid desc limit 1`).get(...args) as PastRun | undefined;
  const best = db
    .prepare(`${where} and r.final_score_percent is not null order by r.final_score_percent desc limit 1`)
    .get(...args) as PastRun | undefined;
  return {
    last: withZones(db, last),
    best: withZones(db, best),
    scope: firearmId ? ("firearm" as const) : ("course" as const),
  };
}

export type ArmoryPick = { id: string; label: string; caliber: string | null; shots_fired: number; platform: string | null };

/** One weapon of the course, with the firearms that fit it listed first. */
export type ArmorySlot = { category: string | null; matched: ArmoryPick[]; others: ArmoryPick[] };

export function armoryForRun(db: Database.Database, cofId: string, categories: string[] = []) {
  const list = db
    .prepare(
      `select id, firearm_label(make_model, nickname) as label, caliber, shots_fired, platform
         from firearms where status != 'sold' order by label`
    )
    .all() as ArmoryPick[];
  const lastUsed = db
    .prepare(`select firearm_id from range_log where cof_id = ? and firearm_id is not null order by date desc, rowid desc limit 1`)
    .get(cofId) as { firearm_id: string } | undefined;

  // A combined arms course is fired with more than one firearm, and its rounds
  // have to land on the right one, so it asks per weapon rather than once.
  const slots: ArmorySlot[] = isCombinedArms(categories)
    ? categories.map((category) => ({
        category,
        matched: list.filter((f) => firearmMatchesCategories(f.platform, [category])),
        others: list.filter((f) => !firearmMatchesCategories(f.platform, [category])),
      }))
    : [{ category: null, matched: list, others: [] }];

  return { list, slots, lastUsed: lastUsed?.firearm_id ?? null };
}
