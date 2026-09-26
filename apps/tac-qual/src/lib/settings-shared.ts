import type { DateFormat } from "@core/lib/format";

export { formatDate, formatDay, formatDateTime, todayISO, type DateFormat } from "@core/lib/format";

export type AppSettings = {
  instructorName: string;
  defaultClassLocation: string;
  defaultRelaySize: number;
  theme: "dark" | "light";
  textSize: "normal" | "large" | "xlarge";
  dateFormat: DateFormat;
  autoLockMinutes: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
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
