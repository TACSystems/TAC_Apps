"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { updateSettings } from "@/lib/settings";
import { normalizeHome, type HomeLayout } from "@/lib/settings-shared";
import { DEFAULT_OPTIONS, OPTION_CATEGORIES, type OptionCategory } from "@/lib/db/dropdown-options";
import { normalizeCategories } from "@core/lib/course-categories";

const isCategory = (c: string): c is OptionCategory => c in OPTION_CATEGORIES;

function done(category?: string): never {
  revalidatePath("/controls");
  revalidatePath("/classes");
  revalidatePath("/courses");
  redirect(category ? `/controls?open=${encodeURIComponent(category)}#dd-${category}` : "/controls");
}

/**
 * A value in a dropdown is also written onto the records that chose it, so a
 * rename has to follow it. Otherwise a class quietly falls out of its group
 * and a course loses its filter chip.
 */
function retag(db: ReturnType<typeof getDb>, category: OptionCategory, from: string, to: string | null) {
  if (category === "class_type") {
    if (to) db.prepare(`update classes set class_type = ? where class_type = ?`).run(to, from);
    else db.prepare(`update classes set class_type = null where class_type = ?`).run(from);
    return;
  }
  if (category !== "course_category") return;
  const rows = db
    .prepare(`select id, categories_json from courses_of_fire where categories_json is not null`)
    .all() as { id: string; categories_json: string }[];
  const upd = db.prepare(`update courses_of_fire set categories_json = ? where id = ?`);
  db.transaction(() => {
    for (const r of rows) {
      const list = normalizeCategories(r.categories_json);
      if (!list.some((c) => c.toLowerCase() === from.toLowerCase())) continue;
      const next = normalizeCategories(
        list.flatMap((c) => (c.toLowerCase() === from.toLowerCase() ? (to ? [to] : []) : [c]))
      );
      upd.run(next.length ? JSON.stringify(next) : null, r.id);
    }
  })();
}

export async function addDropdownOption(category: OptionCategory, formData: FormData) {
  if (!isCategory(category)) done();
  const db = getDb();
  const value = String(formData.get("value") || "").trim().slice(0, 80);
  if (!value) done(category);
  const { m } = db
    .prepare(`select coalesce(max(sort_order), -1) as m from dropdown_options where category = ?`)
    .get(category) as { m: number };
  db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (?, ?, ?, ?)
     on conflict(category, value) do nothing`
  ).run(randomUUID(), category, value, m + 1);
  done(category);
}

export async function deleteDropdownOption(category: OptionCategory, id: string) {
  if (!isCategory(category)) done();
  const db = getDb();
  const row = db.prepare(`select value from dropdown_options where id = ?`).get(id) as { value: string } | undefined;
  if (row) {
    retag(db, category, row.value, null);
    db.prepare(`delete from dropdown_options where id = ?`).run(id);
  }
  done(category);
}

export async function renameDropdownOption(category: OptionCategory, id: string, formData: FormData) {
  if (!isCategory(category)) done();
  const db = getDb();
  const value = String(formData.get("value") || "").trim().slice(0, 80);
  const row = db.prepare(`select value from dropdown_options where id = ?`).get(id) as { value: string } | undefined;
  if (row && value && value !== row.value) {
    db.prepare(`update dropdown_options set value = ? where id = ?`).run(value, id);
    retag(db, category, row.value, value);
  }
  done(category);
}

export async function moveDropdownOption(category: OptionCategory, id: string, dir: -1 | 1) {
  if (!isCategory(category)) done();
  const db = getDb();
  const rows = db
    .prepare(`select id from dropdown_options where category = ? order by sort_order, value`)
    .all(category) as { id: string }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < rows.length) {
    [rows[i], rows[j]] = [rows[j], rows[i]];
    const upd = db.prepare(`update dropdown_options set sort_order = ? where id = ?`);
    db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
  }
  done(category);
}

export async function sortDropdownAlpha(category: OptionCategory) {
  if (!isCategory(category)) done();
  const db = getDb();
  const rows = db
    .prepare(`select id from dropdown_options where category = ? order by value collate nocase`)
    .all(category) as { id: string }[];
  const upd = db.prepare(`update dropdown_options set sort_order = ? where id = ?`);
  db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
  done(category);
}

export async function restoreDropdownDefaults(category: OptionCategory) {
  if (!isCategory(category)) done();
  const db = getDb();
  const have = new Set(
    (db.prepare(`select value from dropdown_options where category = ?`).all(category) as { value: string }[]).map(
      (r) => r.value
    )
  );
  const { m } = db
    .prepare(`select coalesce(max(sort_order), -1) as m from dropdown_options where category = ?`)
    .get(category) as { m: number };
  const ins = db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (?, ?, ?, ?)
     on conflict(category, value) do nothing`
  );
  let n = m;
  db.transaction(() => {
    for (const v of DEFAULT_OPTIONS[category]) if (!have.has(v)) ins.run(randomUUID(), category, v, ++n);
  })();
  done(category);
}

export async function saveHomeLayout(layout: HomeLayout) {
  updateSettings(getDb(), { home: normalizeHome(layout) });
  revalidatePath("/");
  revalidatePath("/controls");
  return { ok: true };
}
