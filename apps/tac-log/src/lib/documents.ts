import type Database from "better-sqlite3-multiple-ciphers";
import { todayISO } from "@/lib/settings-shared";

export const DOC_TYPES = [
  "Carry Permit",
  "NFA Tax Stamp",
  "NFA Form 4 / Form 1 (Pending)",
  "Range Membership",
  "Hunting License",
  "FFL / C&R License",
  "Training Certificate",
  "Other",
] as const;

export const NFA_STATUSES = ["Not Filed", "Pending", "Approved", "Denied"] as const;

export type DocRow = {
  id: string;
  doc_type: string;
  title: string;
  issuer: string | null;
  number: string | null;
  holder: string | null;
  firearm_id: string | null;
  status: string | null;
  issued_date: string | null;
  expires_date: string | null;
  notes: string | null;
  created_at: string;
};

export type DocState = "expired" | "urgent" | "soon" | "ok" | "none";

export function daysUntil(iso: string | null, today = todayISO()) {
  if (!iso) return null;
  const a = new Date(`${today}T00:00:00`).getTime();
  const b = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function docState(d: Pick<DocRow, "expires_date">, warnDays: number, urgentDays: number): DocState {
  const n = daysUntil(d.expires_date);
  if (n == null) return "none";
  if (n < 0) return "expired";
  if (n <= urgentDays) return "urgent";
  if (n <= warnDays) return "soon";
  return "ok";
}

export function listDocuments(db: Database.Database) {
  return db
    .prepare(
      `select d.*, firearm_label(f.make_model, f.nickname) as firearm_label
       from documents d left join firearms f on f.id = d.firearm_id
       order by case when d.expires_date is null then 1 else 0 end, d.expires_date, d.title`
    )
    .all() as (DocRow & { firearm_label: string | null })[];
}

export function expiringDocuments(db: Database.Database, warnDays: number, urgentDays: number) {
  return listDocuments(db)
    .map((d) => ({ ...d, state: docState(d, warnDays, urgentDays), days: daysUntil(d.expires_date) }))
    .filter((d) => d.state === "expired" || d.state === "urgent" || d.state === "soon");
}
