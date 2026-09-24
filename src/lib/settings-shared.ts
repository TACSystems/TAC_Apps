export const HOME_SECTIONS = {
  quick_actions: "Quick Actions",
  search: "Search Bar",
  maintenance: "Maintenance Schedule",
  ammo: "Ammo On Hand",
  recent_sessions: "Recent Range Sessions",
} as const;

export type HomeSectionKey = keyof typeof HOME_SECTIONS;

export type HomeLayout = {
  sections: { key: HomeSectionKey; visible: boolean }[];
  recentCount: number;
  maintenanceDueOnly: boolean;
  includeStored: boolean;
};

export type AppSettings = {
  home: HomeLayout;
  defaultShooterName: string;
  defaultGraderName: string;
  defaultRangeLocation: string;
  defaultCleanIntervalRounds: number | null;
  defaultCleanIntervalDays: number | null;
  dueSoonPercent: number;
  deductManualRoundsByDefault: boolean;
  lowAmmoPercent: number;
  currencySymbol: string;
  autoLockMinutes: number;
  firearmLabel: FirearmLabelMode;
  dateFormat: DateFormat;
};

export type FirearmLabelMode = "make_model" | "nickname" | "both" | "make_model_nickname";
export type DateFormat = "us" | "iso" | "eu";

export const FIREARM_LABEL_MODES: Record<FirearmLabelMode, string> = {
  make_model: "Make / Model",
  nickname: "Nickname (when set)",
  both: "Nickname (Make / Model)",
  make_model_nickname: "Make / Model (Nickname)",
};

export const DATE_FORMATS: Record<DateFormat, string> = {
  us: "MM/DD/YYYY",
  iso: "YYYY-MM-DD",
  eu: "DD/MM/YYYY",
};

export const DEFAULT_HOME: HomeLayout = {
  sections: [
    { key: "quick_actions", visible: true },
    { key: "search", visible: true },
    { key: "maintenance", visible: true },
    { key: "ammo", visible: true },
    { key: "recent_sessions", visible: true },
  ],
  recentCount: 5,
  maintenanceDueOnly: false,
  includeStored: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  home: DEFAULT_HOME,
  defaultShooterName: "",
  defaultGraderName: "",
  defaultRangeLocation: "",
  defaultCleanIntervalRounds: null,
  defaultCleanIntervalDays: null,
  dueSoonPercent: 80,
  deductManualRoundsByDefault: true,
  lowAmmoPercent: 50,
  currencySymbol: "$",
  autoLockMinutes: 0,
  firearmLabel: "both",
  dateFormat: "us",
};

export function normalizeHome(raw: unknown): HomeLayout {
  const r = (raw ?? {}) as Partial<HomeLayout>;
  const keys = Object.keys(HOME_SECTIONS) as HomeSectionKey[];
  const seen = new Set<HomeSectionKey>();
  const sections: HomeLayout["sections"] = [];
  for (const s of Array.isArray(r.sections) ? r.sections : []) {
    if (s && keys.includes(s.key) && !seen.has(s.key)) {
      seen.add(s.key);
      sections.push({ key: s.key, visible: Boolean(s.visible) });
    }
  }
  for (const k of keys) if (!seen.has(k)) sections.push({ key: k, visible: true });
  const recent = Number(r.recentCount);
  return {
    sections,
    recentCount: Number.isFinite(recent) ? Math.min(25, Math.max(1, Math.round(recent))) : 5,
    maintenanceDueOnly: Boolean(r.maintenanceDueOnly),
    includeStored: r.includeStored === undefined ? true : Boolean(r.includeStored),
  };
}

export function money(value: number, symbol: string) {
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined, format: DateFormat = "us"): string {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (!m) return String(value);
  const [, y, mo, d, rest] = m;
  const time = rest.match(/[T ](\d{2}):(\d{2})/);
  const base = format === "iso" ? `${y}-${mo}-${d}` : format === "eu" ? `${d}/${mo}/${y}` : `${mo}/${d}/${y}`;
  return time ? `${base} ${time[1]}:${time[2]}` : base;
}

export function formatDay(value: string | null | undefined, format: DateFormat = "us"): string {
  return formatDate(value ? String(value).slice(0, 10) : value, format);
}

export type LabelledFirearm = { make_model: string; nickname?: string | null };

export function firearmLabel(f: LabelledFirearm | null | undefined, mode: FirearmLabelMode = "both"): string {
  if (!f) return "";
  const nick = f.nickname?.trim();
  if (!nick || mode === "make_model") return f.make_model;
  if (mode === "nickname") return nick;
  if (mode === "make_model_nickname") return `${f.make_model} (${nick})`;
  return `${nick} (${f.make_model})`;
}

export function formatDateTime(value: string | null | undefined, format: DateFormat = "us"): string {
  if (!value) return "";
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return formatDate(raw, format);
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}${m[7] ?? "Z"}`);
  if (Number.isNaN(d.getTime())) return formatDate(raw, format);
  const p = (n: number) => String(n).padStart(2, "0");
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = format === "us" ? `${h}:${p(d.getMinutes())} ${ampm}` : `${p(d.getHours())}:${p(d.getMinutes())}`;
  return `${formatDate(iso, format)} ${time}`;
}
