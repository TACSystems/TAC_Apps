"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  addCourse,
  addInstructor,
  autoAssignRelays,
  createClass,
  deleteClass,
  duplicateClass,
  enroll,
  removeCourse,
  removeInstructor,
  setRelayLane,
  unenroll,
  updateClass,
} from "@/lib/classes";
import { deleteRun, saveRelayScores } from "@/lib/scoring";

function instructor() {
  return getSettings(getDb()).instructorName || null;
}

export async function saveClass(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  if (id) {
    if (!updateClass(db, id, formData)) {
      await flash("A title and date are required.", "error");
      return;
    }
    await flash("Class saved.");
    revalidatePath(`/classes/${id}`);
    redirect(`/classes/${id}`);
  }
  const newId = createClass(db, formData, instructor());
  if (!newId) {
    await flash("A title and date are required.", "error");
    return;
  }
  await flash("Class created.");
  revalidatePath("/classes");
  redirect(`/classes/${newId}`);
}

export async function copyClass(formData: FormData) {
  const db = getDb();
  const sourceId = String(formData.get("id") ?? "");
  const source = db.prepare(`select title, date, location, notes from classes where id = ?`).get(sourceId) as
    | { title: string; date: string; location: string | null; notes: string | null }
    | undefined;
  if (!source) {
    await flash("That class no longer exists.", "error");
    revalidatePath("/classes");
    return;
  }
  const date = String(formData.get("date") ?? "") || source.date;
  const title = String(formData.get("title") ?? "").trim() || source.title;
  const newId = duplicateClass(
    db,
    sourceId,
    { title, date, location: source.location ?? "", notes: source.notes ?? "", status: "planned" },
    instructor()
  );
  if (!newId) {
    await flash("That class could not be copied.", "error");
    revalidatePath("/classes");
    return;
  }
  await flash("Class copied. The courses and instructors came across; the roster is empty.");
  revalidatePath("/classes");
  redirect(`/classes/${newId}`);
}

export async function removeClass(formData: FormData) {
  deleteClass(getDb(), String(formData.get("id") ?? ""));
  await flash("Class deleted.");
  revalidatePath("/classes");
  redirect("/classes");
}

export async function addClassCourse(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const cofId = String(formData.get("cof_id") ?? "");
  if (cofId) {
    addCourse(getDb(), classId, cofId);
    await flash("Course added to the class.");
  }
  revalidatePath(`/classes/${classId}`);
}

export async function removeClassCourse(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  removeCourse(getDb(), String(formData.get("id") ?? ""));
  await flash("Course removed.");
  revalidatePath(`/classes/${classId}`);
}

export async function addClassInstructor(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "assistant");
  if (name) {
    addInstructor(getDb(), classId, name.slice(0, 120), role === "lead" || role === "grader" ? role : "assistant");
    await flash("Instructor credited.");
  }
  revalidatePath(`/classes/${classId}`);
}

export async function removeClassInstructor(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  removeInstructor(getDb(), String(formData.get("id") ?? ""));
  revalidatePath(`/classes/${classId}`);
}

export async function enrollStudents(formData: FormData) {
  const db = getDb();
  const classId = String(formData.get("class_id") ?? "");
  const ids = formData.getAll("student_id").map(String).filter(Boolean);
  for (const sid of ids) enroll(db, classId, sid);
  await flash(ids.length === 1 ? "Student enrolled." : `${ids.length} students enrolled.`);
  revalidatePath(`/classes/${classId}`);
}

export async function unenrollStudent(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  unenroll(getDb(), String(formData.get("id") ?? ""));
  await flash("Student removed from the class.");
  revalidatePath(`/classes/${classId}`);
}

export async function saveRelayLane(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const relay = Number(formData.get("relay"));
  const lane = Number(formData.get("lane"));
  setRelayLane(
    getDb(),
    String(formData.get("id") ?? ""),
    Number.isFinite(relay) && relay > 0 ? relay : null,
    Number.isFinite(lane) && lane > 0 ? lane : null
  );
  revalidatePath(`/classes/${classId}`);
}

export async function autoRelays(formData: FormData) {
  const db = getDb();
  const classId = String(formData.get("class_id") ?? "");
  const size = Number(formData.get("size")) || getSettings(db).defaultRelaySize;
  const n = autoAssignRelays(db, classId, Math.max(1, Math.min(40, size)));
  await flash(`${n} students assigned into relays of ${size}.`);
  revalidatePath(`/classes/${classId}`);
}

export async function saveScores(formData: FormData) {
  const db = getDb();
  const classId = String(formData.get("class_id") ?? "");
  const cofId = String(formData.get("cof_id") ?? "");
  const attempt = Math.max(1, Number(formData.get("attempt")) || 1);
  const kind = String(formData.get("kind") ?? "qual") === "remedial" ? "remedial" : "qual";
  const date = String(formData.get("date") ?? "");
  const studentIds = formData.getAll("row_student").map(String).filter(Boolean);

  const entries = studentIds.map((sid) => {
    const counts: Record<string, number> = {};
    for (const [key, value] of formData.entries()) {
      const prefix = `count:${sid}:`;
      if (key.startsWith(prefix)) {
        const zone = key.slice(prefix.length);
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) counts[zone] = Math.round(n);
      }
    }
    return {
      studentId: sid,
      counts,
      firearmDesc: String(formData.get(`firearm:${sid}`) ?? "").trim() || null,
    };
  });

  const { saved, skipped } = saveRelayScores(db, {
    classId,
    cofId,
    date,
    attempt,
    kind,
    scoredBy: instructor(),
    entries,
  });

  await flash(
    saved === 0
      ? "Nothing to save — no hits were entered."
      : `${saved} scored${skipped ? `, ${skipped} left blank` : ""}.`,
    saved === 0 ? "error" : "ok"
  );
  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/classes/${classId}/score/${cofId}`);
}

export async function removeRun(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const cofId = String(formData.get("cof_id") ?? "");
  deleteRun(getDb(), String(formData.get("id") ?? ""));
  await flash("Run deleted.");
  revalidatePath(`/classes/${classId}/score/${cofId}`);
}
