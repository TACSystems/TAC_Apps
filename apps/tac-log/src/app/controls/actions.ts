"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_OPTIONS, DROPDOWN_CATEGORIES, type DropdownCategory } from "@/lib/options";
import { updateSettings, type HomeLayout } from "@/lib/settings";
import { normalizeCategories } from "@core/lib/course-categories";

function isCategory(c: string): c is DropdownCategory {
  return c in DROPDOWN_CATEGORIES;
}

function done(category?: string): never {
  revalidatePath("/", "layout");
  redirect(category ? `/controls?open=${category}#dd-${category}` : "/controls");
}

export async function addDropdownOption(category: DropdownCategory, formData: FormData) {
  if (!isCategory(category)) done();
  const db = getDb();
  const value = String(formData.get("value") || "").trim().slice(0, 80);
  if (!value) done(category);
  const maxOrder = (
    db
      .prepare(`select coalesce(max(sort_order), -1) as m from dropdown_options where category = ?`)
      .get(category) as { m: number }
  ).m;
  db.prepare(
    `insert into dropdown_options (id, category, value, sort_order)
     values (@id, @category, @value, @sort_order)
     on conflict(category, value) do nothing`
  ).run({ id: randomUUID(), category, value, sort_order: maxOrder + 1 });
  done(category);
}

function retagCourses(db: ReturnType<typeof getDb>, from: string, to: string | null) {
  const rows = db
    .prepare(`select id, categories_json from courses_of_fire where categories_json is not null`)
    .all() as { id: string; categories_json: string }[];
  const upd = db.prepare(`update courses_of_fire set categories_json = ? where id = ?`);
  db.transaction(() => {
    for (const r of rows) {
      const list = normalizeCategories(r.categories_json);
      if (!list.some((c) => c.toLowerCase() === from.toLowerCase())) continue;
      const next = normalizeCategories(list.flatMap((c) => (c.toLowerCase() === from.toLowerCase() ? (to ? [to] : []) : [c])));
      upd.run(next.length ? JSON.stringify(next) : null, r.id);
    }
  })();
}

export async function deleteDropdownOption(category: string, id: string) {
  const db = getDb();
  const row = db.prepare(`select value from dropdown_options where id = ?`).get(id) as { value: string } | undefined;
  db.prepare(`delete from dropdown_options where id = ?`).run(id);
  if (category === "course_category" && row) {
    retagCourses(db, row.value, null);
    revalidatePath("/courses");
  }
  done(category);
}

export async function renameDropdownOption(category: string, id: string, formData: FormData) {
  const value = String(formData.get("value") || "").trim().slice(0, 80);
  if (value) {
    try {
      const db = getDb();
      const row = db.prepare(`select value from dropdown_options where id = ?`).get(id) as { value: string } | undefined;
      db.prepare(`update dropdown_options set value = ? where id = ?`).run(value, id);
      if (category === "course_category" && row && row.value !== value) {
        retagCourses(db, row.value, value);
        revalidatePath("/courses");
      }
    } catch {
    }
  }
  done(category);
}

export async function moveDropdownOption(category: DropdownCategory, id: string, dir: -1 | 1) {
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

export async function sortDropdownAlpha(category: DropdownCategory) {
  const db = getDb();
  const rows = db
    .prepare(`select id from dropdown_options where category = ? order by value collate nocase`)
    .all(category) as { id: string }[];
  const upd = db.prepare(`update dropdown_options set sort_order = ? where id = ?`);
  db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
  done(category);
}

export async function restoreDropdownDefaults(category: DropdownCategory) {
  if (!isCategory(category)) done();
  const db = getDb();
  const maxOrder = (
    db
      .prepare(`select coalesce(max(sort_order), -1) as m from dropdown_options where category = ?`)
      .get(category) as { m: number }
  ).m;
  const ins = db.prepare(
    `insert into dropdown_options (id, category, value, sort_order) values (?, ?, ?, ?)
     on conflict(category, value) do nothing`
  );
  db.transaction(() =>
    DEFAULT_OPTIONS[category].forEach((v, k) => ins.run(randomUUID(), category, v, maxOrder + 1 + k))
  )();
  done(category);
}

export async function saveHomeLayout(layout: HomeLayout) {
  updateSettings(getDb(), { home: layout });
  revalidatePath("/");
  revalidatePath("/controls");
  return { ok: true };
}
