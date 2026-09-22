import type Database from "better-sqlite3";
import { DEFAULT_SETTINGS, normalizeHome, type AppSettings } from "./settings-shared";

export * from "./settings-shared";

function clampNum(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function optionalPositiveInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeSettings(raw: Partial<AppSettings> & Record<string, unknown>): AppSettings {
  const d = DEFAULT_SETTINGS;
  const str = (v: unknown, fallback: string, max = 120) =>
    typeof v === "string" ? v.trim().slice(0, max) : fallback;
  return {
    home: normalizeHome(raw.home ?? d.home),
    defaultShooterName: str(raw.defaultShooterName, d.defaultShooterName),
    defaultGraderName: str(raw.defaultGraderName, d.defaultGraderName),
    defaultRangeLocation: str(raw.defaultRangeLocation, d.defaultRangeLocation),
    defaultCleanIntervalRounds: optionalPositiveInt(raw.defaultCleanIntervalRounds),
    defaultCleanIntervalDays: optionalPositiveInt(raw.defaultCleanIntervalDays),
    dueSoonPercent: clampNum(raw.dueSoonPercent, 1, 99, d.dueSoonPercent),
    deductManualRoundsByDefault:
      raw.deductManualRoundsByDefault === undefined ? d.deductManualRoundsByDefault : Boolean(raw.deductManualRoundsByDefault),
    lowAmmoPercent: clampNum(raw.lowAmmoPercent, 1, 100, d.lowAmmoPercent),
    currencySymbol: str(raw.currencySymbol, d.currencySymbol, 4) || d.currencySymbol,
    autoLockMinutes: [0, 5, 10, 15, 30, 60].includes(Number(raw.autoLockMinutes)) ? Number(raw.autoLockMinutes) : 0,
  };
}

export function getSettings(db: Database.Database): AppSettings {
  const rows = db.prepare(`select key, value from app_settings`).all() as { key: string; value: string }[];
  const raw: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      raw[r.key] = JSON.parse(r.value);
    } catch {
      raw[r.key] = r.value;
    }
  }
  return normalizeSettings(raw);
}

export function updateSettings(db: Database.Database, patch: Partial<AppSettings>) {
  const merged = normalizeSettings({ ...getSettings(db), ...patch });
  const upsert = db.prepare(
    `insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value`
  );
  db.transaction(() => {
    for (const key of Object.keys(patch) as (keyof AppSettings)[]) {
      upsert.run(key, JSON.stringify(merged[key]));
    }
  })();
  return merged;
}

export function getFlag(db: Database.Database, key: string): string | null {
  const row = db.prepare(`select value from app_settings where key = ?`).get(`flag:${key}`) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setFlag(db: Database.Database, key: string, value: string) {
  db.prepare(
    `insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value`
  ).run(`flag:${key}`, value);
}
