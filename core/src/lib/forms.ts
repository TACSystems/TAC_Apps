export type ActionResult = { ok: boolean; error?: string; message?: string };

export function ok(message?: string): ActionResult {
  return { ok: true, message };
}

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

type Source = FormData | Record<string, unknown>;

function raw(src: Source, key: string): unknown {
  return src instanceof FormData ? src.get(key) : src[key];
}

export function text(src: Source, key: string, max = 500): string | null {
  const v = raw(src, key);
  if (v == null || typeof v === "object") return null;
  const s = String(v).trim();
  return s === "" ? null : s.slice(0, max);
}

export function textOr(src: Source, key: string, fallback: string, max = 500): string {
  return text(src, key, max) ?? fallback;
}

export function number(src: Source, key: string, opts: { min?: number; max?: number; int?: boolean } = {}): number | null {
  const v = raw(src, key);
  if (v == null || v === "" || typeof v === "object") return null;
  let n = Number(String(v).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  if (opts.int) n = Math.round(n);
  if (opts.min != null && n < opts.min) n = opts.min;
  if (opts.max != null && n > opts.max) n = opts.max;
  return n;
}

export function isValidISODate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 1900 && y <= 2200;
}

export function isoDate(src: Source, key: string): string | null {
  const v = text(src, key, 10);
  return isValidISODate(v) ? v : null;
}

export function dateOr(src: Source, key: string, fallback: string): string {
  return isoDate(src, key) ?? fallback;
}

export function checkbox(src: Source, key: string): boolean {
  const v = raw(src, key);
  return v === "on" || v === "true" || v === "1" || v === true;
}
