import type Database from "better-sqlite3";
import type { Firearm } from "@/lib/db/types";

export type MaintenanceStatus = "due" | "soon" | "ok" | "unset";

export type MaintenanceInfo = {
  firearm: Firearm;
  status: MaintenanceStatus;
  roundsSince: number;
  roundsPct: number | null;
  lastCleanedDate: string | null;
  daysSince: number | null;
  daysPct: number | null;
  nextDueDate: string | null;
  roundsRemaining: number | null;
  lastEntry: { date: string; type: string } | null;
};


function daysBetween(fromIso: string, to: Date) {
  const from = new Date(`${fromIso}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function maintenanceInfo(
  firearm: Firearm,
  lastCleanedDate: string | null,
  lastEntry: { date: string; type: string } | null,
  soonThreshold = 0.8,
  today = new Date()
): MaintenanceInfo {
  const roundsSince = Math.max(0, firearm.shots_fired - (firearm.last_cleaned_at_shots ?? 0));
  const roundsInterval = firearm.clean_interval_rounds;
  const daysInterval = firearm.clean_interval_days;

  const roundsPct = roundsInterval ? roundsSince / roundsInterval : null;

  const referenceDate = lastCleanedDate ?? firearm.purchase_date ?? firearm.date_of_entry.slice(0, 10);
  const daysSince = referenceDate ? daysBetween(referenceDate, today) : null;
  const daysPct = daysInterval && daysSince != null ? daysSince / daysInterval : null;
  const nextDueDate = daysInterval && referenceDate ? addDays(referenceDate, daysInterval) : null;

  const worst = Math.max(roundsPct ?? -1, daysPct ?? -1);
  let status: MaintenanceStatus;
  if (roundsPct == null && daysPct == null) status = "unset";
  else if (worst >= 1) status = "due";
  else if (worst >= soonThreshold) status = "soon";
  else status = "ok";

  return {
    firearm,
    status,
    roundsSince,
    roundsPct,
    lastCleanedDate,
    daysSince: lastCleanedDate ? daysSince : null,
    daysPct,
    nextDueDate,
    roundsRemaining: roundsInterval ? roundsInterval - roundsSince : null,
    lastEntry,
  };
}

const STATUS_ORDER: Record<MaintenanceStatus, number> = { due: 0, soon: 1, ok: 2, unset: 3 };

export function maintenanceSchedule(
  db: Database.Database,
  opts: { soonThreshold?: number; includeStored?: boolean } = {}
): MaintenanceInfo[] {
  const firearms = db
    .prepare(
      `select * from firearms where status != 'sold' ${opts.includeStored === false ? "and status != 'stored'" : ""}
       order by make_model`
    )
    .all() as Firearm[];
  const lastClean = db.prepare(
    `select max(date) as d from maintenance_log where firearm_id = ? and lower(type) = 'cleaning'`
  );
  const lastAny = db.prepare(
    `select date, type from maintenance_log where firearm_id = ? order by date desc, created_at desc limit 1`
  );
  return firearms
    .map((f) =>
      maintenanceInfo(
        f,
        (lastClean.get(f.id) as { d: string | null }).d,
        (lastAny.get(f.id) as { date: string; type: string } | undefined) ?? null,
        opts.soonThreshold ?? 0.8
      )
    )
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        Math.max(b.roundsPct ?? 0, b.daysPct ?? 0) - Math.max(a.roundsPct ?? 0, a.daysPct ?? 0)
    );
}

export const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  due: "DUE",
  soon: "DUE SOON",
  ok: "OK",
  unset: "NO SCHEDULE",
};
