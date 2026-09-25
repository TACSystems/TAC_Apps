"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { applyCofPatch, type CofPatch } from "@core/lib/cof";

export async function importCourses(formData: FormData) {
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    await flash("Choose at least one course file.", "error");
    return;
  }

  const db = getDb();
  let courses = 0;
  try {
    for (const file of files) {
      const patch = JSON.parse(await file.text()) as CofPatch;
      if (!patch || !Array.isArray(patch.courses)) {
        await flash(`${file.name} is not a course export file.`, "error");
        return;
      }
      applyCofPatch(db, patch);
      courses += patch.courses.length;
    }
  } catch {
    await flash("That file could not be read as a course export.", "error");
    return;
  }

  await flash(`${courses} course${courses === 1 ? "" : "s"} imported.`);
  revalidatePath("/courses");
  redirect("/courses");
}
