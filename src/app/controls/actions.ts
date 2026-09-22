"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DropdownCategory } from "@/lib/options";

export async function addDropdownOption(category: DropdownCategory, formData: FormData) {
  const db = getDb();
  const value = String(formData.get("value") || "").trim();
  if (!value) redirect("/controls");

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

  revalidatePath("/controls");
  redirect("/controls");
}

export async function deleteDropdownOption(id: string) {
  const db = getDb();
  db.prepare(`delete from dropdown_options where id = ?`).run(id);
  revalidatePath("/controls");
  redirect("/controls");
}
