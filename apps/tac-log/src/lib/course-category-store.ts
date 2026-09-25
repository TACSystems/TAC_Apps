import type Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import path from "path";
import { dataDir } from "@/lib/db";
import { loadCourse } from "@/lib/cof";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { normalizeCategories, suggestCategories } from "@/lib/course-categories";

const DISMISS_KEY = "flag:categorize_dismissed";

export function courseCategoryOptions(db: Database.Database) {
  return getDropdownOptions(db, "course_category");
}

export function uncategorizedCourses(db: Database.Database) {
  return db
    .prepare(
      `select id, code, name from courses_of_fire
       where categories_json is null or categories_json = '[]' order by name`
    )
    .all() as { id: string; code: string; name: string }[];
}

export function categorizePromptVisible(db: Database.Database) {
  if (db.prepare(`select 1 from app_settings where key = ?`).get(DISMISS_KEY)) return 0;
  return uncategorizedCourses(db).length;
}

export function dismissCategorizePrompt(db: Database.Database) {
  db.prepare(`insert into app_settings (key, value) values (?, '1') on conflict(key) do nothing`).run(DISMISS_KEY);
}

function seedCategories(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(dataDir(), "courses-of-fire.seed.json"), "utf8")) as {
      courses?: { code?: string; categories?: string[] }[];
    };
    for (const c of seed.courses ?? []) if (c.code && c.categories?.length) out.set(c.code, c.categories);
  } catch {}
  return out;
}

export function suggestForCourse(db: Database.Database, id: string, options: string[], seed = seedCategories()): string[] {
  const course = loadCourse(db, id);
  if (!course) return [];
  const fromSeed = seed.get(course.code);
  if (fromSeed) {
    const matched = fromSeed
      .map((c) => options.find((o) => o.toLowerCase() === c.toLowerCase()))
      .filter((c): c is string => Boolean(c));
    if (matched.length) return matched;
  }
  const text = [course.name, course.notes ?? "", ...course.phases.flatMap((p) => [p.title, p.notes ?? "", ...p.strings.flatMap((s) => Object.values(s.values))])].join(" ");
  return suggestCategories(text, options);
}

export function suggestionsForUncategorized(db: Database.Database) {
  const options = courseCategoryOptions(db);
  const seed = seedCategories();
  return uncategorizedCourses(db).map((c) => ({ ...c, suggested: suggestForCourse(db, c.id, options, seed) }));
}

export function setCourseCategories(db: Database.Database, id: string, categories: string[]) {
  const list = normalizeCategories(categories);
  db.prepare(`update courses_of_fire set categories_json = ? where id = ?`).run(list.length ? JSON.stringify(list) : null, id);
}

export function courseCategoryCounts(db: Database.Database) {
  const rows = db.prepare(`select categories_json from courses_of_fire`).all() as { categories_json: string | null }[];
  const counts = new Map<string, number>();
  for (const r of rows) for (const c of normalizeCategories(r.categories_json)) counts.set(c, (counts.get(c) ?? 0) + 1);
  return counts;
}
