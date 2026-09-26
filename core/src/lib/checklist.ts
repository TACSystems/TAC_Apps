import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

export type ChecklistItem = { id: string; list_name: string; section: string | null; text: string; checked: number; sort_order: number };

export const DEFAULT_RANGE_BAG: [string, string[]][] = [
  ["Safety", ["Eye protection", "Ear protection (plugs + muffs)", "First aid / trauma kit (tourniquet)", "Hat"]],
  ["Firearms & Gear", ["Firearms (unloaded, cased)", "Magazines", "Holster / mag pouches", "Belt", "Optic batteries"]],
  ["Ammo", ["Ammo for each caliber", "Ammo lot numbers noted"]],
  ["Targets & Range", ["Targets", "Staples / stapler / tape", "Pasters", "Range membership card / ID", "Pen & scorecards"]],
  ["Tools & Cleaning", ["Multitool / armorer's tool", "Bore snake", "Lubricant", "Rags"]],
  ["Personal", ["Water", "Snacks", "Sunscreen / bug spray", "Rain gear"]],
];

export function checklistNames(db: Database.Database): string[] {
  return (db.prepare(`select distinct list_name from checklist_items order by list_name`).all() as { list_name: string }[]).map((r) => r.list_name);
}

export function checklistItems(db: Database.Database, list: string) {
  return db
    .prepare(`select * from checklist_items where list_name = ? order by sort_order, created_at`)
    .all(list) as ChecklistItem[];
}

export const DEFAULT_INSTRUCTOR_BAG: [string, string[]][] = [
  ["Safety", ["Eye protection (spares for students)", "Ear protection (spares for students)", "First aid / trauma kit (tourniquet)", "Emergency action plan and range contact numbers", "Fire extinguisher"]],
  ["Instruction", ["Course of fire packets", "Blank scorecards", "Class roster and sign-in sheet", "Pens, markers, clipboard", "Whiteboard or easel pad", "Shot timer"]],
  ["Range", ["Targets", "Target stands and backers", "Staples, stapler, tape", "Pasters", "Spray paint", "Range flags and cones"]],
  ["Demo and Loaner Gear", ["Demo firearm (unloaded, cased)", "Dummy rounds / snap caps", "Loaner eye and ear protection", "Spare magazines"]],
  ["Tools", ["Multitool / armorer's tool", "Cleaning kit", "Lubricant", "Spare optic batteries"]],
  ["Admin", ["Instructor certifications", "Insurance and liability waivers", "Student paperwork", "Phone charger / power bank"]],
  ["Personal", ["Water and cooler", "Snacks", "Sunscreen / bug spray", "Rain gear"]],
];

export function seedChecklist(db: Database.Database, list: string, sections: [string, string[]][]) {
  const has = db.prepare(`select 1 from checklist_items where list_name = ? limit 1`).get(list);
  if (has) return;
  const ins = db.prepare(
    `insert into checklist_items (id, list_name, section, text, sort_order) values (?, ?, ?, ?, ?)`
  );
  let i = 0;
  db.transaction(() => {
    for (const [section, items] of sections) for (const t of items) ins.run(randomUUID(), list, section, t, i++);
  })();
}

export function seedRangeBag(db: Database.Database) {
  const has = db.prepare(`select 1 from checklist_items limit 1`).get();
  if (has) return;
  seedChecklist(db, "Range Bag", DEFAULT_RANGE_BAG);
}

export function seedInstructorBag(db: Database.Database) {
  const has = db.prepare(`select 1 from checklist_items limit 1`).get();
  if (has) return;
  seedChecklist(db, "Instructor Bag", DEFAULT_INSTRUCTOR_BAG);
}
