import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

export const OPTION_CATEGORIES = {
  class_location: "Class Locations",
  course_category: "Course Categories",
  caliber: "Calibers",
  instructor_cert: "Certification Types",
  position: "Shooting Positions",
  class_type: "Class Types",
} as const;

export type OptionCategory = keyof typeof OPTION_CATEGORIES;

const SEEDS: Record<OptionCategory, string[]> = {
  class_location: [],
  course_category: ["Handgun", "Rifle", "Shotgun"],
  caliber: ["9mm", ".40 S&W", ".45 ACP", ".38 Special", "5.56 NATO", ".223 Rem", "7.62x39", "12 Gauge", ".22 LR"],
  instructor_cert: ["NRA Instructor", "State Instructor", "Range Safety Officer", "First Aid / CPR"],
  position: ["Standing", "Kneeling", "Prone", "Sitting", "Barricade", "Low Ready", "Holster", "Strong Hand", "Support Hand"],
  class_type: ["Basic Pistol", "Defensive Handgun", "Concealed Carry", "Rifle", "Shotgun", "Qualification Only", "Private Lesson"],
};

export function seedDropdownOptions(db: Database.Database) {
  const insert = db.prepare(
    `insert or ignore into dropdown_options (id, category, value, sort_order) values (?, ?, ?, ?)`
  );
  const seeded = db.prepare(`select count(*) as n from dropdown_options where category = ?`);
  db.transaction(() => {
    for (const [category, values] of Object.entries(SEEDS) as [OptionCategory, string[]][]) {
      if (!values.length) continue;
      const { n } = seeded.get(category) as { n: number };
      if (n > 0) continue;
      values.forEach((value, i) => insert.run(randomUUID(), category, value, i));
    }
  })();
}

export function listOptions(db: Database.Database, category: OptionCategory) {
  return (
    db
      .prepare(`select id, value from dropdown_options where category = ? order by sort_order, value`)
      .all(category) as { id: string; value: string }[]
  ).map((r) => r.value);
}

export function addOption(db: Database.Database, category: OptionCategory, value: string) {
  const next = db.prepare(`select coalesce(max(sort_order), -1) + 1 as n from dropdown_options where category = ?`).get(category) as {
    n: number;
  };
  db.prepare(`insert or ignore into dropdown_options (id, category, value, sort_order) values (?, ?, ?, ?)`).run(
    randomUUID(),
    category,
    value,
    next.n
  );
}

export const OPTION_USED_IN: Record<OptionCategory, string> = {
  class_location: "class details",
  course_category: "courses of fire",
  caliber: "student firearms",
  instructor_cert: "instructor profile",
  position: "course of fire builder",
  class_type: "class details, and how the Classes page is grouped",
};

export const DEFAULT_OPTIONS = SEEDS;

export function getDropdownOptionRows(db: Database.Database, category: OptionCategory) {
  return db
    .prepare(`select id, value from dropdown_options where category = ? order by sort_order, value`)
    .all(category) as { id: string; value: string }[];
}
