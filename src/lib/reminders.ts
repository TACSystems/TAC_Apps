import type Database from "better-sqlite3-multiple-ciphers";
import type { AppSettings } from "@/lib/settings-shared";
import { maintenanceSchedule } from "@/lib/maintenance";
import { goalStatus } from "@/lib/ammo";
import { expiringDocuments } from "@/lib/documents";
import { label } from "@/lib/display";

declare global {
  var __taclogRemindersDismissed: boolean | undefined;
}

export function remindersDismissed() {
  return global.__taclogRemindersDismissed === true;
}

export function setRemindersDismissed(v: boolean) {
  global.__taclogRemindersDismissed = v;
}

export type Reminder = { key: string; text: string; href: string; tone: "red" | "amber" };

export function collectReminders(db: Database.Database, s: AppSettings): Reminder[] {
  const out: Reminder[] = [];
  const sched = maintenanceSchedule(db, { soonThreshold: s.dueSoonPercent / 100, includeStored: false });
  const due = sched.filter((m) => m.status === "due");
  if (due.length) {
    out.push({
      key: "clean",
      text: due.length === 1 ? `${label(due[0].firearm)} is due for cleaning` : `${due.length} firearms are due for cleaning`,
      href: due.length === 1 ? `/inventory/${due[0].firearm.id}` : "/",
      tone: "red",
    });
  }
  const low = goalStatus(db, s.lowAmmoPercent).filter((a) => a.low);
  if (low.length) {
    out.push({ key: "ammo", text: `Low ammo: ${low.map((a) => a.label).join(", ")}`, href: "/ammo", tone: "amber" });
  }
  for (const d of expiringDocuments(db, s.docWarnDays, s.docUrgentDays)) {
    out.push({
      key: `doc-${d.id}`,
      text:
        d.state === "expired"
          ? `${d.title} expired ${Math.abs(d.days ?? 0)} days ago`
          : `${d.title} expires in ${d.days} day${d.days === 1 ? "" : "s"}`,
      href: `/documents/${d.id}`,
      tone: d.state === "soon" ? "amber" : "red",
    });
  }
  const parts = db
    .prepare(
      `select c.id, c.name, c.interval_rounds, f.id as fid, f.make_model, f.nickname, f.shots_fired - c.start_shots as since
       from firearm_counters c join firearms f on f.id = c.firearm_id
       where c.interval_rounds is not null and f.shots_fired - c.start_shots >= c.interval_rounds and f.status != 'sold'`
    )
    .all() as { id: string; name: string; fid: string; make_model: string; nickname: string | null; since: number }[];
  for (const p of parts) {
    out.push({
      key: `part-${p.id}`,
      text: `${label({ make_model: p.make_model, nickname: p.nickname })}: ${p.name} due for replacement (${p.since.toLocaleString()} rounds)`,
      href: `/inventory/${p.fid}#part-counters`,
      tone: "amber",
    });
  }
  return out;
}
