"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { applyCofPatch, type CofPatch } from "@core/lib/cof";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { normalizeCategories } from "@core/lib/course-categories";

export async function previewCourseImport(codes: string[]) {
  const db = getDb();
  const existing: Record<string, string> = {};
  const stmt = db.prepare(`select name from courses_of_fire where code = ?`);
  for (const code of Array.isArray(codes) ? codes.slice(0, 500) : []) {
    const row = stmt.get(String(code)) as { name: string } | undefined;
    if (row) existing[String(code)] = row.name;
  }
  return { existing, options: getDropdownOptions(db, "course_category") };
}

export async function commitCourseImport(courses: CofPatch["courses"]) {
  const list = Array.isArray(courses) ? courses : [];
  if (!list.length) return { ok: false, error: "Nothing to import." };
  const missing = list.filter((c) => !normalizeCategories(c?.categories).length);
  if (missing.length) return { ok: false, error: `Pick a category for: ${missing.map((c) => c?.name ?? c?.code).join(", ")}.` };
  const db = getDb();
  const known = new Set(getDropdownOptions(db, "course_category").map((o) => o.toLowerCase()));
  const maxOrder = (db.prepare(`select coalesce(max(sort_order), -1) as m from dropdown_options where category = 'course_category'`).get() as { m: number }).m;
  let order = maxOrder;
  const add = db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (?, 'course_category', ?, ?) on conflict(category, value) do nothing`
  );
  try {
    const result = db.transaction(() => {
      for (const c of list) {
        c.categories = normalizeCategories(c.categories);
        for (const cat of c.categories) {
          if (!known.has(cat.toLowerCase())) {
            add.run(randomUUID(), cat, ++order);
            known.add(cat.toLowerCase());
          }
        }
      }
      return applyCofPatch(db, { courses: list });
    })();
    revalidatePath("/", "layout");
    return { ok: true, count: result.coursesUpserted };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed." };
  }
}
