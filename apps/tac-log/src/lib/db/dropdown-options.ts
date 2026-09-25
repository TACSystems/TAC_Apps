import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { DEFAULT_OPTIONS, type DropdownCategory } from "@/lib/options";

function seededKey(category: string) {
  return `flag:dropdown_seeded:${category}`;
}

export function seedDropdownOptions(db: Database.Database) {
  const insert = db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (@id, @category, @value, @sort_order)
     on conflict(category, value) do nothing`
  );
  const isSeeded = db.prepare(`select 1 from app_settings where key = ?`);
  const markSeeded = db.prepare(
    `insert into app_settings (key, value) values (?, '1') on conflict(key) do nothing`
  );
  const count = db.prepare(`select count(*) as n from dropdown_options where category = ?`);

  db.transaction(() => {
    (Object.keys(DEFAULT_OPTIONS) as DropdownCategory[]).forEach((category) => {
      if (isSeeded.get(seededKey(category))) return;
      if ((count.get(category) as { n: number }).n === 0) {
        DEFAULT_OPTIONS[category].forEach((value, i) => {
          insert.run({ id: randomUUID(), category, value, sort_order: i });
        });
      }
      markSeeded.run(seededKey(category));
    });
  })();
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

export function getMaintenanceTypes(db: Database.Database): string[] {
  const opts = getDropdownOptions(db, "maintenance_type");
  return opts.some((o) => o.toLowerCase() === "cleaning") ? opts : ["Cleaning", ...opts];
}
