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
