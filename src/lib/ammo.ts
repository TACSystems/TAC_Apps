import type Database from "better-sqlite3";

export type AmmoStatus = {
  caliber: string;
  purchased: number;
  fired: number;
  on_hand: number;
  goal: number | null;
  pct: number | null;
  low: boolean;
};

export function ammoStatus(db: Database.Database, lowPercent: number, goalsOnly = false): AmmoStatus[] {
  const rows = db
    .prepare(
      `select a.caliber, a.purchased, a.fired, a.on_hand, g.goal_quantity as goal
       from ammo_on_hand a left join ammo_goals g on g.caliber = a.caliber
       ${goalsOnly ? "where g.goal_quantity > 0" : ""}
       order by a.caliber`
    )
    .all() as Omit<AmmoStatus, "pct" | "low">[];
  return rows.map((r) => {
    const pct = r.goal && r.goal > 0 ? r.on_hand / r.goal : null;
    return { ...r, pct, low: pct != null && pct * 100 < lowPercent };
  });
}
