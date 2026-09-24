"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { dismissCategorizePrompt, setCourseCategories } from "@/lib/course-category-store";

export async function saveCategorized(entries: { id: string; categories: string[] }[]) {
  const db = getDb();
  const valid = (Array.isArray(entries) ? entries : []).filter((e) => e && typeof e.id === "string");
  db.transaction(() => {
    for (const e of valid) setCourseCategories(db, e.id, Array.isArray(e.categories) ? e.categories : []);
  })();
  dismissCategorizePrompt(db);
  revalidatePath("/", "layout");
  return { ok: true, saved: valid.filter((e) => e.categories?.length).length };
}

export async function dismissCategorize() {
  dismissCategorizePrompt(getDb());
  revalidatePath("/", "layout");
}
