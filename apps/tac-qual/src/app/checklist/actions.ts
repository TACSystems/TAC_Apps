"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

const clean = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export async function toggleItem(id: string, checked: boolean) {
  getDb().prepare(`update checklist_items set checked = ? where id = ?`).run(checked ? 1 : 0, id);
  revalidatePath("/checklist");
}

export async function addItem(list: string, section: string, text: string) {
  const t = clean(text);
  if (!t) return;
  const db = getDb();
  const max = (db.prepare(`select coalesce(max(sort_order), -1) as m from checklist_items where list_name = ?`).get(clean(list, 60)) as { m: number }).m;
  db.prepare(`insert into checklist_items (id, list_name, section, text, sort_order) values (?, ?, ?, ?, ?)`).run(
    randomUUID(),
    clean(list, 60) || "Instructor Bag",
    clean(section, 60) || null,
    t,
    max + 1
  );
  revalidatePath("/checklist");
}

export async function deleteItem(id: string) {
  getDb().prepare(`delete from checklist_items where id = ?`).run(id);
  revalidatePath("/checklist");
}

export async function moveItem(list: string, id: string, dir: -1 | 1) {
  const db = getDb();
  const rows = db.prepare(`select id from checklist_items where list_name = ? order by sort_order, created_at`).all(list) as { id: string }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  const upd = db.prepare(`update checklist_items set sort_order = ? where id = ?`);
  db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
  revalidatePath("/checklist");
}

export async function resetList(list: string) {
  getDb().prepare(`update checklist_items set checked = 0 where list_name = ?`).run(list);
  revalidatePath("/checklist");
}

export async function renameList(from: string, to: string) {
  const name = clean(to, 60);
  if (!name) return;
  getDb().prepare(`update checklist_items set list_name = ? where list_name = ?`).run(name, from);
  revalidatePath("/checklist");
}

export async function deleteList(list: string) {
  getDb().prepare(`delete from checklist_items where list_name = ?`).run(list);
  revalidatePath("/checklist");
}
