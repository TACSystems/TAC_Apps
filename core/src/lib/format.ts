export type DateFormat = "us" | "iso" | "eu";

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

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
