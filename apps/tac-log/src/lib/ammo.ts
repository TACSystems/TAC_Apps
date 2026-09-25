import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

export type StockLine = {
  caliber: string;
  ammo_type: string | null;
  grain: number | null;
  manufacturer: string | null;
  purchased: number;
  fired: number;
  adjusted: number;
  on_hand: number;
};

export type CaliberTotal = { caliber: string; purchased: number; fired: number; adjusted: number; on_hand: number };

export type GoalStatus = {
  id: string;
  caliber: string;
  ammo_type: string | null;
  grain: number | null;
  label: string;
  goal: number;
  on_hand: number;
  pct: number;
  low: boolean;
};

export type AmmoPick = { caliber: string; ammo_type: string | null; grain: number | null; manufacturer: string | null };

export function createAmmoViews(db: Database.Database) {
  db.exec(`
    drop view if exists ammo_on_hand;
    drop view if exists ammo_stock;
    create view ammo_stock as
    with lines as (
      select caliber, nullif(trim(ammo_type), '') as ammo_type, grain, nullif(trim(manufacturer), '') as manufacturer,
        quantity as purchased, 0 as fired, 0 as adjusted
      from ammo_purchases
      union all
      select caliber, nullif(trim(ammo_type), ''), ammo_grain, nullif(trim(ammo_manufacturer), ''), 0, coalesce(rounds_fired, 0), 0
      from range_log where caliber is not null
      union all
      select caliber, nullif(trim(ammo_type), ''), ammo_grain, nullif(trim(ammo_manufacturer), ''), 0, rounds, 0
      from rounds_fired_log where deduct_from_ammo = 1 and caliber is not null
      union all
      select caliber, nullif(trim(ammo_type), ''), grain, nullif(trim(manufacturer), ''), 0, 0, delta
      from count_adjustments where kind = 'ammo' and caliber is not null
    )
    select caliber, ammo_type, grain, manufacturer,
      sum(purchased) as purchased, sum(fired) as fired, sum(adjusted) as adjusted,
      sum(purchased) - sum(fired) + sum(adjusted) as on_hand
    from lines
    group by caliber, ammo_type, grain, manufacturer;

    create view ammo_on_hand as
    with totals as (
      select caliber, sum(purchased) as purchased, sum(fired) as fired, sum(adjusted) as adjusted, sum(on_hand) as on_hand
      from ammo_stock group by caliber
    ),
    calibers as (select caliber from totals union select caliber from ammo_goals)
    select c.caliber,
      coalesce(t.purchased, 0) as purchased,
      coalesce(t.fired, 0) as fired,
      coalesce(t.adjusted, 0) as adjusted,
      coalesce(t.on_hand, 0) as on_hand
    from calibers c left join totals t on t.caliber = c.caliber;
  `);
}

export function migrateAmmoGoals(db: Database.Database) {
  const row = db.prepare(`select sql from sqlite_master where type = 'table' and name = 'ammo_goals'`).get() as
    | { sql: string }
    | undefined;
  if (row && !row.sql.includes("ammo_type")) {
    db.transaction(() => {
      db.exec(`
        create table ammo_goals_new (
          id text primary key,
          caliber text not null,
          ammo_type text,
          grain integer,
          goal_quantity integer not null default 0
        );
        insert into ammo_goals_new (id, caliber, goal_quantity) select id, caliber, goal_quantity from ammo_goals;
        drop table ammo_goals;
        alter table ammo_goals_new rename to ammo_goals;
      `);
    })();
  }
  db.exec(`create unique index if not exists ammo_goals_key on ammo_goals(caliber, coalesce(ammo_type, ''), coalesce(grain, -1))`);
}

export function lineLabel(l: { ammo_type: string | null; grain: number | null }) {
  const parts = [l.ammo_type, l.grain != null ? `${l.grain}gr` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Type / grain not set";
}

export function pickLabel(p: AmmoPick) {
  return [p.caliber, p.ammo_type, p.grain != null ? `${p.grain}gr` : null, p.manufacturer].filter(Boolean).join(" · ");
}

export function isUnassigned(l: Pick<StockLine, "ammo_type" | "grain" | "manufacturer">) {
  return l.ammo_type == null && l.grain == null && l.manufacturer == null;
}

export function stockLines(db: Database.Database) {
  return db
    .prepare(`select * from ammo_stock order by caliber, ammo_type is null, ammo_type, grain is null, grain, manufacturer is null, manufacturer`)
    .all() as StockLine[];
}

export function caliberTotals(db: Database.Database) {
  return db.prepare(`select * from ammo_on_hand order by caliber`).all() as CaliberTotal[];
}

export function goalStatus(db: Database.Database, lowPercent: number): GoalStatus[] {
  const lines = stockLines(db);
  const goals = db
    .prepare(`select * from ammo_goals where goal_quantity > 0 order by caliber, ammo_type is not null, ammo_type, grain`)
    .all() as { id: string; caliber: string; ammo_type: string | null; grain: number | null; goal_quantity: number }[];
  return goals.map((g) => {
    const caliberLines = lines.filter((l) => l.caliber === g.caliber);
    const narrowed = g.ammo_type != null || g.grain != null;
    const matched = caliberLines.filter(
      (l) =>
        !isUnassigned(l) &&
        (g.ammo_type == null || (l.ammo_type ?? "").toLowerCase() === g.ammo_type.toLowerCase()) &&
        (g.grain == null || l.grain === g.grain)
    );
    const onHand = (narrowed ? matched : caliberLines).reduce((s, l) => s + l.on_hand, 0);
    const pct = g.goal_quantity > 0 ? onHand / g.goal_quantity : 0;
    return {
      id: g.id,
      caliber: g.caliber,
      ammo_type: g.ammo_type,
      grain: g.grain,
      label: [g.caliber, g.ammo_type, g.grain != null ? `${g.grain}gr` : null].filter(Boolean).join(" · "),
      goal: g.goal_quantity,
      on_hand: onHand,
      pct,
      low: pct * 100 < lowPercent,
    };
  });
}

export function upsertGoal(
  db: Database.Database,
  input: { caliber: string; ammo_type: string | null; grain: number | null; goal: number }
) {
  const existing = db
    .prepare(
      `select id from ammo_goals where caliber = ? and coalesce(ammo_type, '') = coalesce(?, '') and coalesce(grain, -1) = coalesce(?, -1)`
    )
    .get(input.caliber, input.ammo_type, input.grain) as { id: string } | undefined;
  if (existing) {
    db.prepare(`update ammo_goals set goal_quantity = ? where id = ?`).run(input.goal, existing.id);
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(`insert into ammo_goals (id, caliber, ammo_type, grain, goal_quantity) values (?, ?, ?, ?, ?)`).run(
    id,
    input.caliber,
    input.ammo_type,
    input.grain,
    input.goal
  );
  return id;
}

export type PickOption = AmmoPick & { on_hand: number };

export function pickOptions(db: Database.Database): PickOption[] {
  return stockLines(db)
    .filter((l) => !isUnassigned(l) && (l.purchased > 0 || l.on_hand !== 0))
    .map((l) => ({ caliber: l.caliber, ammo_type: l.ammo_type, grain: l.grain, manufacturer: l.manufacturer, on_hand: l.on_hand }));
}

export function encodePick(p: AmmoPick) {
  return JSON.stringify([p.caliber, p.ammo_type ?? null, p.grain ?? null, p.manufacturer ?? null]);
}

export function decodePick(raw: unknown): AmmoPick | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || typeof v[0] !== "string" || !v[0].trim()) return null;
    const s = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim().slice(0, 100) : null);
    const g = Number(v[2]);
    return {
      caliber: v[0].trim().slice(0, 100),
      ammo_type: s(v[1]),
      grain: v[2] != null && v[2] !== "" && Number.isFinite(g) ? Math.round(g) : null,
      manufacturer: s(v[3]),
    };
  } catch {
    return null;
  }
}

export function lastPicks(db: Database.Database) {
  const rows = db
    .prepare(
      `select firearm_id, caliber, ammo_type, ammo_grain as grain, ammo_manufacturer as manufacturer from (
         select firearm_id, caliber, ammo_type, ammo_grain, ammo_manufacturer, date, created_at from range_log
         where firearm_id is not null and caliber is not null and (ammo_type is not null or ammo_grain is not null or ammo_manufacturer is not null)
         union all
         select firearm_id, caliber, ammo_type, ammo_grain, ammo_manufacturer, date, created_at from rounds_fired_log
         where firearm_id is not null and caliber is not null and (ammo_type is not null or ammo_grain is not null or ammo_manufacturer is not null)
       ) order by date desc, created_at desc`
    )
    .all() as (AmmoPick & { firearm_id: string })[];
  const out: Record<string, string> = {};
  for (const r of rows) if (!out[r.firearm_id]) out[r.firearm_id] = encodePick(r);
  return out;
}

export type BreakdownKind = "caliber" | "brand" | "type";
export type Dim = "caliber" | "manufacturer" | "ammo_type" | "grain";

export const BREAKDOWNS: Record<BreakdownKind, { title: string; dims: Dim[] }> = {
  caliber: { title: "By Caliber", dims: ["caliber"] },
  brand: { title: "By Caliber · Brand · Grain", dims: ["caliber", "manufacturer", "grain"] },
  type: { title: "By Caliber · Type · Grain", dims: ["caliber", "ammo_type", "grain"] },
};

export type BreakdownRow = {
  key: string;
  caliber: string;
  manufacturer: string | null;
  ammo_type: string | null;
  grain: number | null;
  unassigned: boolean;
  purchased: number;
  fired: number;
  adjusted: number;
  on_hand: number;
  spent: number;
  priced_qty: number;
};

export function breakdown(db: Database.Database, kind: BreakdownKind): BreakdownRow[] {
  const dims = BREAKDOWNS[kind].dims;
  const keyOf = (r: { caliber: string; manufacturer: string | null; ammo_type: string | null; grain: number | null }, unassigned: boolean) =>
    unassigned && dims.length > 1 ? `${r.caliber}\u0000unassigned` : dims.map((d) => String(r[d] ?? "")).join("\u0000");
  const map = new Map<string, BreakdownRow>();
  const get = (r: StockLine | (AmmoPick & { caliber: string }), unassigned: boolean) => {
    const key = keyOf(r, unassigned);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        caliber: r.caliber,
        manufacturer: dims.includes("manufacturer") && !unassigned ? r.manufacturer : null,
        ammo_type: dims.includes("ammo_type") && !unassigned ? r.ammo_type : null,
        grain: dims.includes("grain") && !unassigned ? r.grain : null,
        unassigned: unassigned && dims.length > 1,
        purchased: 0,
        fired: 0,
        adjusted: 0,
        on_hand: 0,
        spent: 0,
        priced_qty: 0,
      };
      map.set(key, row);
    }
    return row;
  };
  for (const l of stockLines(db)) {
    const row = get(l, isUnassigned(l) && l.purchased === 0);
    row.purchased += l.purchased;
    row.fired += l.fired;
    row.adjusted += l.adjusted;
    row.on_hand += l.on_hand;
  }
  const priced = db
    .prepare(
      `select caliber, nullif(trim(manufacturer), '') as manufacturer, nullif(trim(ammo_type), '') as ammo_type, grain,
         sum(price) as spent, sum(quantity) as qty
       from ammo_purchases where price is not null and quantity > 0
       group by caliber, nullif(trim(manufacturer), ''), nullif(trim(ammo_type), ''), grain`
    )
    .all() as (AmmoPick & { spent: number; qty: number })[];
  for (const p of priced) {
    const row = map.get(keyOf(p, false));
    if (!row) continue;
    row.spent += p.spent;
    row.priced_qty += p.qty;
  }
  return [...map.values()].sort(
    (a, b) =>
      a.caliber.localeCompare(b.caliber) ||
      Number(a.unassigned) - Number(b.unassigned) ||
      (a.manufacturer ?? "~").localeCompare(b.manufacturer ?? "~") ||
      (a.ammo_type ?? "~").localeCompare(b.ammo_type ?? "~") ||
      (a.grain ?? 1e9) - (b.grain ?? 1e9)
  );
}
