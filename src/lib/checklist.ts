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

export function seedRangeBag(db: Database.Database) {
  const has = db.prepare(`select 1 from checklist_items limit 1`).get();
  if (has) return;
  const ins = db.prepare(`insert into checklist_items (id, list_name, section, text, sort_order) values (?, 'Range Bag', ?, ?, ?)`);
  let i = 0;
  db.transaction(() => {
    for (const [section, items] of DEFAULT_RANGE_BAG) for (const t of items) ins.run(randomUUID(), section, t, i++);
  })();
}
