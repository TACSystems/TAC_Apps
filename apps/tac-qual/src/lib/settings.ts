import type Database from "better-sqlite3-multiple-ciphers";
import { DEFAULT_SETTINGS, type AppSettings } from "./settings-shared";
import { setDateFormat } from "./display";

export * from "./settings-shared";

function clampNum(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function normalizeSettings(raw: Partial<AppSettings> & Record<string, unknown>): AppSettings {
  const d = DEFAULT_SETTINGS;
  const str = (v: unknown, fallback: string, max = 120) =>
    typeof v === "string" ? v.trim().slice(0, max) : fallback;
  return {
    instructorName: str(raw.instructorName, d.instructorName),
    defaultClassLocation: str(raw.defaultClassLocation, d.defaultClassLocation),
    defaultRelaySize: clampNum(raw.defaultRelaySize, 1, 40, d.defaultRelaySize),
    qualCurrencyMonths: clampNum(raw.qualCurrencyMonths, 1, 120, d.qualCurrencyMonths),
    theme: raw.theme === "light" ? "light" : "dark",
    textSize: ["normal", "large", "xlarge"].includes(String(raw.textSize))
      ? (raw.textSize as AppSettings["textSize"])
      : d.textSize,
    dateFormat: ["us", "iso", "eu"].includes(String(raw.dateFormat))
      ? (raw.dateFormat as AppSettings["dateFormat"])
      : d.dateFormat,
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
  const stmt = db.prepare(
    `insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value`
  );
  db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) stmt.run(k, JSON.stringify(v));
  })();
  const next = getSettings(db);
  setDateFormat(next.dateFormat);
  return next;
}
