export const BUILTIN_COLUMN_KEYS = [
  "distance",
  "weapon",
  "rounds",
  "time_limit",
  "position",
  "action",
] as const;

export type BuiltinColumnKey = (typeof BUILTIN_COLUMN_KEYS)[number];

export const BUILTIN_COLUMN_LABELS: Record<BuiltinColumnKey, string> = {
  distance: "Distance",
  weapon: "Weapon",
  rounds: "Rounds",
  time_limit: "Time",
  position: "Position",
  action: "Action",
};

export type CourseColumn = { key: string; label: string };

export const BUILTIN_FIELD_KEYS = [
  "shooter_name",
  "date",
  "range_location",
  "weapon_used",
  "caliber",
  "grain",
  "ammo_lot",
  "weather_conditions",
  "grader_name",
  "grader_signature",
  "grader_date",
] as const;

export const BUILTIN_FIELD_LABELS: Record<(typeof BUILTIN_FIELD_KEYS)[number], string> = {
  shooter_name: "Shooter Name",
  date: "Date",
  range_location: "Range / Location",
  weapon_used: "Weapon Used",
  caliber: "Caliber",
  grain: "Grain",
  ammo_lot: "Ammo Lot #",
  weather_conditions: "Weather Conditions",
  grader_name: "Grader Name",
  grader_signature: "Grader Signature",
  grader_date: "Grader Date",
};

export type ScorecardField = { key: string; label: string; wide?: boolean; printOnly?: boolean };
export type ScorecardConfig = { header: ScorecardField[]; signoff: ScorecardField[] };

export const DEFAULT_SCORECARD: ScorecardConfig = {
  header: [
    { key: "shooter_name", label: "Shooter Name", wide: true },
    { key: "date", label: "Date" },
    { key: "range_location", label: "Range / Location" },
    { key: "weapon_used", label: "Weapon Used" },
    { key: "caliber", label: "Caliber" },
    { key: "grain", label: "Grain" },
    { key: "ammo_lot", label: "Ammo Lot #" },
    { key: "weather_conditions", label: "Weather Conditions", wide: true },
  ],
  signoff: [
    { key: "grader_name", label: "Grader Name" },
    { key: "grader_date", label: "Grader Date" },
    { key: "grader_signature", label: "Grader Signature", wide: true, printOnly: true },
  ],
};

export type ZoneDef = { zone_label: string; value: number };

export type TargetTypeDef = {
  id: string;
  name: string;
  description: string | null;
  zones: ZoneDef[];
};

export type StringRow = {
  row_type: "string" | "note";
  string_number: number | null;
  option_label: string | null;
  values: Record<string, string>;
};

export type PhaseDef = {
  title: string;
  notes: string | null;
  phase_total_rounds: number | null;
  strings: StringRow[];
};

export type CourseDef = {
  id?: string;
  code: string;
  name: string;
  notes: string | null;
  total_rounds: number | null;
  target_type_id: string | null;
  passing_score_percent: number | null;
  columns: CourseColumn[];
  scorecard: ScorecardConfig;
  phases: PhaseDef[];
};

export type LoadedCourse = CourseDef & {
  id: string;
  target: TargetTypeDef | null;
  computed_total_rounds: number;
  effective_total_rounds: number;
};

export function isBuiltinColumn(key: string): key is BuiltinColumnKey {
  return (BUILTIN_COLUMN_KEYS as readonly string[]).includes(key);
}

export function parseRounds(value: string | null | undefined): number {
  if (!value) return 0;
  const nums = String(value).match(/\d+(\.\d+)?/g);
  if (!nums) return 0;
  return nums.reduce((sum, n) => sum + Number(n), 0);
}

export function computePhaseRounds(phase: Pick<PhaseDef, "strings">): number {
  const counted = new Set<string>();
  let total = 0;
  for (const s of phase.strings) {
    if (s.row_type !== "string") continue;
    if (s.string_number != null) {
      const key = String(s.string_number);
      if (s.option_label && counted.has(key)) continue;
      counted.add(key);
    }
    total += parseRounds(s.values.rounds);
  }
  return total;
}

export function effectivePhaseRounds(phase: PhaseDef): number {
  return phase.phase_total_rounds ?? computePhaseRounds(phase);
}

export function computeCourseRounds(phases: PhaseDef[]): number {
  return phases.reduce((sum, p) => sum + effectivePhaseRounds(p), 0);
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function normalizeColumns(cols: unknown): CourseColumn[] | null {
  if (!Array.isArray(cols)) return null;
  const seen = new Set<string>();
  const out: CourseColumn[] = [];
  for (const c of cols) {
    if (!c || typeof c !== "object") continue;
    const key = String((c as CourseColumn).key ?? "").trim();
    const label = String((c as CourseColumn).label ?? "").trim();
    if (!key || seen.has(key) || !/^[a-z0-9_]+$/i.test(key)) continue;
    seen.add(key);
    out.push({ key, label: label || (isBuiltinColumn(key) ? BUILTIN_COLUMN_LABELS[key] : "Column") });
  }
  return out;
}

export function normalizeScorecard(sc: unknown): ScorecardConfig {
  const fix = (list: unknown): ScorecardField[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const out: ScorecardField[] = [];
    for (const f of list) {
      if (!f || typeof f !== "object") continue;
      const key = String((f as ScorecardField).key ?? "").trim();
      const label = String((f as ScorecardField).label ?? "").trim();
      if (!key || seen.has(key) || !/^[a-z0-9_]+$/i.test(key) || !label) continue;
      seen.add(key);
      out.push({
        key,
        label,
        wide: Boolean((f as ScorecardField).wide),
        printOnly: Boolean((f as ScorecardField).printOnly),
      });
    }
    return out;
  };
  if (!sc || typeof sc !== "object") return structuredClone(DEFAULT_SCORECARD);
  return {
    header: fix((sc as ScorecardConfig).header),
    signoff: fix((sc as ScorecardConfig).signoff),
  };
}

export const RANGE_LOG_FIELD_COLUMNS = [
  "date",
  "range_location",
  "weapon_used",
  "caliber",
  "grain",
  "ammo_lot",
  "weather_conditions",
  "grader_name",
] as const;

export function maxPointsFor(totalRounds: number, zones: ZoneDef[]) {
  const top = zones.reduce((m, z) => Math.max(m, z.value), 0);
  return totalRounds * top;
}

export function passFail(score: number | null, passing: number | null): "PASS" | "FAIL" | null {
  if (score == null || passing == null) return null;
  return score >= passing ? "PASS" : "FAIL";
}
