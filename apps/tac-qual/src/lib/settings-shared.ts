import type { DateFormat } from "@core/lib/format";

export { formatDate, formatDay, formatDateTime, todayISO, type DateFormat } from "@core/lib/format";

export const HOME_SECTIONS = {
  tiles: "Stat Tiles",
  quick_actions: "Quick Actions",
  calendar: "Class Calendar",
  currency: "Qualification Currency",
  recent_classes: "Recent Classes",
} as const;

export type HomeSectionKey = keyof typeof HOME_SECTIONS;

export type HomeLayout = {
  sections: { key: HomeSectionKey; visible: boolean }[];
  calendarWeeks: number;
  recentCount: number;
  currencyDueSoonDays: number;
  currencyHideCurrent: boolean;
};

export const CALENDAR_WEEKS = [3, 4, 5, 6, 8] as const;
export const DUE_SOON_DAYS = [7, 14, 30, 60, 90] as const;

export const DEFAULT_HOME: HomeLayout = {
  sections: [
    { key: "tiles", visible: true },
    { key: "quick_actions", visible: true },
    { key: "calendar", visible: true },
    { key: "currency", visible: true },
    { key: "recent_classes", visible: true },
  ],
  calendarWeeks: 5,
  recentCount: 5,
  currencyDueSoonDays: 30,
  currencyHideCurrent: true,
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
  // A key added in a later version is appended in its default position rather
  // than vanishing because the stored layout predates it.
  for (const k of keys) {
    if (seen.has(k)) continue;
    const at = DEFAULT_HOME.sections.findIndex((d) => d.key === k);
    sections.splice(Math.min(at < 0 ? sections.length : at, sections.length), 0, { key: k, visible: true });
  }
  const pick = (v: unknown, allowed: readonly number[], fallback: number) =>
    allowed.includes(Number(v)) ? Number(v) : fallback;
  const recent = Number(r.recentCount);
  return {
    sections,
    calendarWeeks: pick(r.calendarWeeks, CALENDAR_WEEKS, DEFAULT_HOME.calendarWeeks),
    recentCount: Number.isFinite(recent) ? Math.min(25, Math.max(1, Math.round(recent))) : DEFAULT_HOME.recentCount,
    currencyDueSoonDays: pick(r.currencyDueSoonDays, DUE_SOON_DAYS, DEFAULT_HOME.currencyDueSoonDays),
    currencyHideCurrent: r.currencyHideCurrent === undefined ? true : Boolean(r.currencyHideCurrent),
  };
}

export type AppSettings = {
  home: HomeLayout;
  instructorName: string;
  defaultClassLocation: string;
  defaultRelaySize: number;
  theme: "dark" | "light";
  textSize: "normal" | "large" | "xlarge";
  dateFormat: DateFormat;
  autoLockMinutes: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  home: DEFAULT_HOME,
  instructorName: "",
  defaultClassLocation: "",
  defaultRelaySize: 6,
  theme: "dark",
  textSize: "normal",
  dateFormat: "us",
  autoLockMinutes: 0,
};

export const TEXT_SIZES = { normal: "Normal", large: "Large", xlarge: "Extra Large" } as const;

export const DATE_FORMATS: Record<DateFormat, string> = {
  us: "MM/DD/YYYY",
  iso: "YYYY-MM-DD",
  eu: "DD/MM/YYYY",
};

export const TEXT_SCALE: Record<AppSettings["textSize"], string> = {
  normal: "100%",
  large: "112.5%",
  xlarge: "125%",
};

export function studentLabel(s: { last_name: string; first_name: string }) {
  return `${s.last_name}, ${s.first_name}`;
}
