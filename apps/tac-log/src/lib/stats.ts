import type Database from "better-sqlite3-multiple-ciphers";
import { normalizeCategories } from "@core/lib/course-categories";

export type CourseStat = {
  id: string;
  name: string;
  code: string;
  sessions: number;
  avg: number | null;
  best: number | null;
  graded: number;
  passed: number;
  last: string | null;
};

export function courseStats(db: Database.Database): CourseStat[] {
  return db
    .prepare(
      `select c.id, c.name, c.code,
         count(r.id) as sessions,
         round(avg(r.final_score_percent), 1) as avg,
         max(r.final_score_percent) as best,
         sum(case when r.passing_score_percent is not null and r.final_score_percent is not null then 1 else 0 end) as graded,
         sum(case when r.passing_score_percent is not null and r.final_score_percent >= r.passing_score_percent then 1 else 0 end) as passed,
         max(r.date) as last
       from courses_of_fire c left join range_log r on r.cof_id = c.id
       group by c.id order by sessions desc, c.name`
    )
    .all() as CourseStat[];
}

export type FirearmStat = {
  id: string;
  make_model: string;
  label: string;
  shots_fired: number;
  sessions: number;
  avg: number | null;
  best: number | null;
  malfunctions: number;
};

export function firearmStats(db: Database.Database): FirearmStat[] {
  return db
    .prepare(
      `select f.id, f.make_model, firearm_label(f.make_model, f.nickname) as label, f.shots_fired,
         (select count(*) from range_log r where r.firearm_id = f.id) as sessions,
         (select round(avg(final_score_percent), 1) from range_log r where r.firearm_id = f.id) as avg,
         (select max(final_score_percent) from range_log r where r.firearm_id = f.id) as best,
         f.malfunctions + (select count(*) from malfunction_log m where m.firearm_id = f.id) as malfunctions
       from firearms f where f.status != 'sold' order by f.shots_fired desc, f.make_model`
    )
    .all() as FirearmStat[];
}

export type CaliberCost = {
  caliber: string;
  purchased: number;
  spent: number;
  priced_rounds: number;
  cpr: number | null;
  fired: number;
  fired_cost: number | null;
};

export function caliberCosts(db: Database.Database): CaliberCost[] {
  const rows = db
    .prepare(
      `select a.caliber, a.purchased, a.fired,
         coalesce((select sum(price) from ammo_purchases p where p.caliber = a.caliber and p.price is not null and p.quantity > 0), 0) as spent,
         coalesce((select sum(quantity) from ammo_purchases p where p.caliber = a.caliber and p.price is not null and p.quantity > 0), 0) as priced_rounds
       from ammo_on_hand a where a.purchased > 0 or a.fired > 0 order by a.caliber`
    )
    .all() as Omit<CaliberCost, "cpr" | "fired_cost">[];
  return rows.map((r) => {
    const cpr = r.priced_rounds > 0 ? r.spent / r.priced_rounds : null;
    return { ...r, cpr, fired_cost: cpr != null ? cpr * r.fired : null };
  });
}

export function costPerRound(db: Database.Database, caliber: string | null): number | null {
  if (!caliber) return null;
  const r = db
    .prepare(
      `select sum(price) as spent, sum(quantity) as qty from ammo_purchases
       where caliber = ? and price is not null and quantity > 0`
    )
    .get(caliber) as { spent: number | null; qty: number | null };
  return r.qty ? (r.spent ?? 0) / r.qty : null;
}

export function roundsByMonth(db: Database.Database, months = 12): { month: string; rounds: number }[] {
  const rows = db
    .prepare(
      `select substr(date, 1, 7) as month, sum(rounds) as rounds from (
         select date, coalesce(rounds_fired, 0) as rounds from range_log
         union all select date, rounds from rounds_fired_log
       ) group by month`
    )
    .all() as { month: string; rounds: number }[];
  const map = new Map(rows.map((r) => [r.month, r.rounds]));
  const out: { month: string; rounds: number }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, rounds: map.get(key) ?? 0 });
  }
  return out;
}

export function zoneDistribution(db: Database.Database, cofId: string) {
  return db
    .prepare(
      `select z.zone_label, max(z.value) as value, sum(z.counted) as counted
       from range_log_zone_counts z join range_log r on r.id = z.range_log_id
       where r.cof_id = ? group by z.zone_label order by value desc`
    )
    .all(cofId) as { zone_label: string; value: number; counted: number }[];
}

export function overview(db: Database.Database) {
  const one = <T,>(sql: string) => db.prepare(sql).get() as T;
  const year = new Date().getFullYear();
  return {
    sessions: one<{ n: number }>(`select count(*) as n from range_log`).n,
    totalRounds: one<{ n: number | null }>(`select sum(shots_fired) as n from firearms`).n ?? 0,
    roundsThisYear:
      one<{ n: number | null }>(
        `select sum(r) as n from (select coalesce(rounds_fired,0) as r, date from range_log
           union all select rounds, date from rounds_fired_log) where substr(date,1,4) = '${year}'`
      ).n ?? 0,
    avgScore: one<{ n: number | null }>(`select round(avg(final_score_percent),1) as n from range_log`).n,
    graded: one<{ n: number }>(
      `select count(*) as n from range_log where passing_score_percent is not null and final_score_percent is not null`
    ).n,
    passed: one<{ n: number }>(
      `select count(*) as n from range_log where passing_score_percent is not null and final_score_percent >= passing_score_percent`
    ).n,
  };
}

export type CategoryStat = { category: string; sessions: number; avg: number | null; best: number | null; graded: number; passed: number };

export function categoryStats(db: Database.Database): CategoryStat[] {
  const rows = db
    .prepare(
      `select c.categories_json, r.final_score_percent as score, r.passing_score_percent as passing
       from range_log r join courses_of_fire c on c.id = r.cof_id`
    )
    .all() as { categories_json: string | null; score: number | null; passing: number | null }[];
  const acc = new Map<string, { sessions: number; scores: number[]; graded: number; passed: number }>();
  for (const r of rows) {
    const cats = normalizeCategories(r.categories_json);
    for (const c of cats.length ? cats : ["Uncategorized"]) {
      const a = acc.get(c) ?? { sessions: 0, scores: [], graded: 0, passed: 0 };
      a.sessions += 1;
      if (r.score != null) a.scores.push(r.score);
      if (r.score != null && r.passing != null) {
        a.graded += 1;
        if (r.score >= r.passing) a.passed += 1;
      }
      acc.set(c, a);
    }
  }
  return [...acc.entries()]
    .map(([category, a]) => ({
      category,
      sessions: a.sessions,
      avg: a.scores.length ? Math.round((a.scores.reduce((s, x) => s + x, 0) / a.scores.length) * 10) / 10 : null,
      best: a.scores.length ? Math.max(...a.scores) : null,
      graded: a.graded,
      passed: a.passed,
    }))
    .sort((x, y) => (x.category === "Uncategorized" ? 1 : y.category === "Uncategorized" ? -1 : y.sessions - x.sessions));
}
