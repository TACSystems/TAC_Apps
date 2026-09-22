import type Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { DEFAULT_OPTIONS, type DropdownCategory } from "@/lib/options";

export function seedDropdownOptions(db: Database.Database) {
  const count = (db.prepare("select count(*) as n from dropdown_options").get() as { n: number })
    .n;
  if (count > 0) return;

  const insert = db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (@id, @category, @value, @sort_order)`
  );
  const insertAll = db.transaction(() => {
    (Object.keys(DEFAULT_OPTIONS) as DropdownCategory[]).forEach((category) => {
      DEFAULT_OPTIONS[category].forEach((value, i) => {
        insert.run({ id: randomUUID(), category, value, sort_order: i });
      });
    });
  });
  insertAll();
}

export function getDropdownOptions(db: Database.Database, category: DropdownCategory): string[] {
  return getDropdownOptionRows(db, category).map((r) => r.value);
}

export function getDropdownOptionRows(
  db: Database.Database,
  category: DropdownCategory
): { id: string; value: string }[] {
  return db
    .prepare(`select id, value from dropdown_options where category = ? order by sort_order, value`)
    .all(category) as { id: string; value: string }[];
}
