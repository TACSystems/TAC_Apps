import type { CourseColumn, StringRow } from "@core/lib/cof-shared";
import { BUILTIN_COLUMN_LABELS } from "@core/lib/cof-shared";

export type BRow = StringRow & { uid: string };
export type BPhase = { uid: string; title: string; notes: string; total: string; strings: BRow[] };

export const input = "input input-sm";
export const cellInput = "w-full min-w-[4rem] border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm normal-case";
export const smallBtn = "btn btn-secondary btn-xs";
export const addLink = "text-sm text-brand-amber hover:text-brand-amber-light";

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function customKey(prefix: string) {
  return `${prefix}_${uid().replace(/-/g, "").slice(0, 8)}`;
}

export function moved<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const DEFAULT_NEW_COLUMNS: CourseColumn[] = ["distance", "rounds", "time_limit", "position", "action"].map(
  (k) => ({ key: k, label: BUILTIN_COLUMN_LABELS[k as keyof typeof BUILTIN_COLUMN_LABELS] })
);

