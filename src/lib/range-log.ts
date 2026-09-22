import type Database from "better-sqlite3";
import { randomUUID } from "crypto";
import {
  DEFAULT_SCORECARD,
  RANGE_LOG_FIELD_COLUMNS,
  maxPointsFor,
  type ScorecardConfig,
  type ZoneDef,
} from "@/lib/cof-shared";
import type { Firearm } from "@/lib/db/types";

function str(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export function parseRangeLogForm(
  db: Database.Database,
  formData: FormData,
  zones: ZoneDef[],
  totalRounds: number,
  scorecard: ScorecardConfig | null
) {
  let totalPoints = 0;
  let roundsCounted = 0;
  const zoneRows = zones.map((z) => {
    const counted = Math.max(0, Math.round(Number(formData.get(`zone:${z.zone_label}`) || 0)));
    totalPoints += z.value * counted;
    roundsCounted += counted;
    return { zone_label: z.zone_label, value: z.value, counted };
  });

  const maxPossible = maxPointsFor(totalRounds, zones);
  const finalScorePercent = maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 1000) / 10 : null;
  const roundsFired = Math.max(0, Math.round(Number(formData.get("rounds_fired") || 0)));

  const firearmId = str(formData.get("firearm_id"));
  let caliber = str(formData.get("field:caliber"));
  if (!caliber && firearmId) {
    const firearm = db.prepare(`select caliber from firearms where id = ?`).get(firearmId) as
      | Pick<Firearm, "caliber">
      | undefined;
    caliber = firearm?.caliber ?? null;
  }

  const columnKeys = new Set<string>(RANGE_LOG_FIELD_COLUMNS);
  const custom: Record<string, string> = {};
  const sc = scorecard ?? DEFAULT_SCORECARD;
  for (const f of [...sc.header, ...sc.signoff]) {
    if (f.printOnly || columnKeys.has(f.key)) continue;
    const v = str(formData.get(`field:${f.key}`));
    if (v) custom[f.key] = v;
  }
  const grain = str(formData.get("field:grain"));

  return {
    zoneRows,
    firearmId,
    roundsFired,
    values: {
      firearm_id: firearmId,
      date: String(formData.get("date")),
      range_location: str(formData.get("field:range_location")),
      weapon_used: str(formData.get("field:weapon_used")),
      caliber,
      grain: grain && Number.isFinite(Number(grain)) ? Number(grain) : null,
      ammo_lot: str(formData.get("field:ammo_lot")),
      weather_conditions: str(formData.get("field:weather_conditions")),
      rounds_fired: roundsFired || null,
      rounds_counted: roundsCounted || null,
      total_points: totalPoints,
      final_score_percent: finalScorePercent,
      grader_name: str(formData.get("field:grader_name")),
      custom_fields_json: Object.keys(custom).length ? JSON.stringify(custom) : null,
      notes: str(formData.get("notes")),
    },
  };
}

export function writeZoneCounts(
  db: Database.Database,
  logId: string,
  rows: { zone_label: string; value: number; counted: number }[]
) {
  db.prepare(`delete from range_log_zone_counts where range_log_id = ?`).run(logId);
  const ins = db.prepare(
    `insert into range_log_zone_counts (id, range_log_id, zone_label, value, counted)
     values (@id, @range_log_id, @zone_label, @value, @counted)`
  );
  for (const z of rows) ins.run({ id: randomUUID(), range_log_id: logId, ...z });
}

export function adjustShots(db: Database.Database, firearmId: string | null, delta: number) {
  if (!firearmId || !delta) return;
  db.prepare(`update firearms set shots_fired = max(0, shots_fired + ?) where id = ?`).run(delta, firearmId);
}
