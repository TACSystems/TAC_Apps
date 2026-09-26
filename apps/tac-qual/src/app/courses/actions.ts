"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { saveCourse, validateCourseDef } from "@core/lib/cof";
import { flash } from "@core/lib/flash";

export async function saveCourseAction(payload: unknown): Promise<{ error: string } | { id: string }> {
  const checked = validateCourseDef(payload);
  if ("error" in checked) return { error: checked.error };
  try {
    const id = saveCourse(getDb(), checked.def);
    revalidatePath("/courses");
    revalidatePath(`/courses/${id}`);
    return { id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the course." };
  }
}

export async function deleteCourse(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  const scored = (
    db.prepare(`select count(*) as n from score_runs where cof_id = ?`).get(id) as { n: number }
  ).n;
  if (scored > 0) {
    await flash(`That course has ${scored} scored run${scored === 1 ? "" : "s"} against it and can't be deleted.`, "error");
    redirect(`/courses/${id}`);
  }
  db.prepare(`delete from courses_of_fire where id = ?`).run(id);
  await flash("Course deleted.");
  revalidatePath("/courses");
  redirect("/courses");
}
