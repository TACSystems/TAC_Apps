"use server";

import { getDb } from "@/lib/db";
import { isUnlocked } from "@/lib/security-state";
import { fd } from "@/lib/display";

export type QuickHit = { group: string; label: string; sub?: string; href: string };

const PAGES: QuickHit[] = [
  { group: "Pages", label: "Home / Dashboard", href: "/" },
  { group: "Pages", label: "Armory", href: "/inventory" },
  { group: "Pages", label: "Add Firearm", href: "/inventory/new" },
  { group: "Pages", label: "Accessories", href: "/inventory/accessories" },
  { group: "Pages", label: "Inventory Report (insurance)", href: "/reports/inventory" },
  { group: "Pages", label: "Permits & Documents", href: "/documents" },
  { group: "Pages", label: "Ammo", href: "/ammo" },
  { group: "Pages", label: "Courses of Fire", href: "/courses" },
  { group: "Pages", label: "Build a Course of Fire", href: "/courses/new" },
  { group: "Pages", label: "Target Types", href: "/targets" },
  { group: "Pages", label: "Range Log", href: "/range-log" },
  { group: "Pages", label: "Log a Range Session", href: "/range-log/new" },
  { group: "Pages", label: "Log Practice (several firearms)", href: "/range-day" },
  { group: "Pages", label: "Ammo by caliber (full list)", href: "/ammo/breakdown/caliber" },
  { group: "Pages", label: "Ammo by caliber, brand, grain", href: "/ammo/breakdown/brand" },
  { group: "Pages", label: "Ammo by caliber, type, grain", href: "/ammo/breakdown/type" },
  { group: "Pages", label: "Log Ammo Purchase", href: "/ammo?open=purchase" },
  { group: "Pages", label: "Set an Ammo Goal", href: "/ammo?open=goal" },
  { group: "Pages", label: "Par Timer", href: "/timer" },
  { group: "Pages", label: "Range Bag Checklist", href: "/checklist" },
  { group: "Pages", label: "Stats", href: "/stats" },
  { group: "Pages", label: "Controls (customize pages)", href: "/controls" },
  { group: "Pages", label: "Help", href: "/help" },
  { group: "Pages", label: "What's New / Changelog", href: "/settings/whats-new" },
  { group: "Settings", label: "Security (PIN, password, encryption)", href: "/settings#settings-security" },
  { group: "Settings", label: "Backup", href: "/settings#settings-backup" },
  { group: "Settings", label: "Restore", href: "/settings#settings-restore" },
  { group: "Settings", label: "Import / Export", href: "/settings#settings-import-export" },
  { group: "Settings", label: "Heads Up bar", href: "/settings#settings-heads-up" },
  { group: "Controls", label: "Dashboard layout", href: "/controls#controls-home-layout" },
  { group: "Controls", label: "Cleaning & maintenance defaults", href: "/controls#controls-maintenance" },
  { group: "Controls", label: "Correct rounds fired (several firearms)", href: "/controls#controls-firearm-counts" },
  { group: "Controls", label: "Ammo defaults & low-ammo threshold", href: "/controls#controls-ammo" },
  { group: "Controls", label: "Correct ammo on hand (several calibers)", href: "/controls#controls-ammo-counts" },
  { group: "Controls", label: "Course categories", href: "/controls?open=course_category#dd-course_category" },
  { group: "Controls", label: "Range session defaults", href: "/controls#controls-range-defaults" },
  { group: "Controls", label: "Document expiration warnings", href: "/controls#controls-documents" },
  { group: "Controls", label: "Dropdown lists (calibers, platforms, …)", href: "/controls" },
  { group: "Settings", label: "Display (theme, text size, date format)", href: "/settings#settings-display" },
  { group: "Settings", label: "Updates (check for a new version)", href: "/settings#settings-updates" },
  { group: "Settings", label: "About", href: "/settings#settings-about" },
];

export async function quickSearch(query: string): Promise<QuickHit[]> {
  if (!isUnlocked()) return [];
  const q = String(query ?? "").trim().toLowerCase().slice(0, 80);
  const words = q.split(/\s+/).filter(Boolean);
  const match = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const pages = PAGES.filter((p) => !q || match(`${p.group} ${p.label}`));
  if (!q) return pages.slice(0, 12);
  const db = getDb();
  const like = `%${words[0]}%`;
  const out: QuickHit[] = [];
  const firearms = db
    .prepare(
      `select id, make_model, nickname, serial_number, caliber, firearm_label(make_model, nickname) as label from firearms
       where lower(make_model || ' ' || coalesce(nickname,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(caliber,'') || ' ' || coalesce(platform,'')) like ?
       limit 30`
    )
    .all(like) as { id: string; make_model: string; nickname: string | null; serial_number: string | null; caliber: string | null; label: string }[];
  for (const f of firearms)
    if (match(`${f.make_model} ${f.nickname ?? ""} ${f.serial_number ?? ""} ${f.caliber ?? ""}`))
      out.push({ group: "Firearms", label: f.label, sub: [f.caliber, f.serial_number ? `SN ${f.serial_number}` : null].filter(Boolean).join(" · "), href: `/inventory/${f.id}` });
  const acc = db
    .prepare(`select id, make_model, type, serial_number from accessories where lower(make_model || ' ' || coalesce(type,'') || ' ' || coalesce(serial_number,'')) like ? limit 20`)
    .all(like) as { id: string; make_model: string; type: string | null; serial_number: string | null }[];
  for (const a of acc)
    if (match(`${a.make_model} ${a.type ?? ""} ${a.serial_number ?? ""}`))
      out.push({ group: "Accessories", label: a.make_model, sub: a.type ?? undefined, href: `/inventory/accessories/${a.id}` });
  const courses = db
    .prepare(`select id, name, code, categories_json from courses_of_fire where lower(name || ' ' || code || ' ' || coalesce(categories_json,'')) like ? limit 20`)
    .all(like) as { id: string; name: string; code: string; categories_json: string | null }[];
  for (const c of courses)
    if (match(`${c.name} ${c.code} ${c.categories_json ?? ""}`)) out.push({ group: "Courses", label: c.name, sub: c.code, href: `/courses/${c.id}` });
  const docs = db
    .prepare(`select id, title, doc_type, number from documents where lower(title || ' ' || doc_type || ' ' || coalesce(number,'') || ' ' || coalesce(issuer,'')) like ? limit 20`)
    .all(like) as { id: string; title: string; doc_type: string; number: string | null }[];
  for (const d of docs) if (match(`${d.title} ${d.doc_type} ${d.number ?? ""}`)) out.push({ group: "Documents", label: d.title, sub: d.doc_type, href: `/documents/${d.id}` });
  const trips = db
    .prepare(
      `select id, number, date, location from range_sessions
       where lower('#' || substr('0000' || number, -4) || ' ' || number || ' ' || date || ' ' || coalesce(location,'')) like ?
       order by date desc limit 20`
    )
    .all(like) as { id: string; number: number; date: string; location: string | null }[];
  for (const t of trips)
    if (match(`#${String(t.number).padStart(4, "0")} ${t.number} ${t.date} ${t.location ?? ""}`))
      out.push({
        group: "Range Sessions",
        label: `#${String(t.number).padStart(4, "0")} · ${fd(t.date)}`,
        sub: t.location ?? undefined,
        href: `/range-log/session/${t.id}`,
      });
  const sessions = db
    .prepare(
      `select r.id, r.date, c.name as course, firearm_label(f.make_model, f.nickname) as firearm, r.final_score_percent as score
       from range_log r left join courses_of_fire c on c.id = r.cof_id left join firearms f on f.id = r.firearm_id
       where lower(coalesce(c.name,'') || ' ' || coalesce(f.make_model,'') || ' ' || coalesce(f.nickname,'') || ' ' || r.date || ' ' || coalesce(r.range_location,'')) like ?
       order by r.date desc limit 20`
    )
    .all(like) as { id: string; date: string; course: string | null; firearm: string | null; score: number | null }[];
  for (const s of sessions)
    out.push({
      group: "Course Runs",
      label: `${fd(s.date)} · ${s.course ?? "Unlisted course"}`,
      sub: [s.firearm, s.score != null ? `${s.score}%` : null].filter(Boolean).join(" · "),
      href: `/range-log/${s.id}`,
    });
  return [...pages, ...out].slice(0, 40);
}
