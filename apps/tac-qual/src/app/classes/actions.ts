"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  addCourse,
  addInstructor,
  attachCertificationCourses,
  autoAssignRelays,
  createClass,
  deleteClass,
  enroll,
  removeCourse,
  saveClassDays,
  removeInstructor,
  setRelayLane,
  unenroll,
  updateClass,
} from "@/lib/classes";
import { deleteRun, saveRelayScores } from "@/lib/scoring";

function instructor() {
  return getSettings(getDb()).instructorName || null;
}

/** Day rows arrive as three parallel arrays, one entry per row on the form. */
function readDays(formData: FormData) {
  const dates = formData.getAll("day_date").map(String);
  const starts = formData.getAll("day_start").map(String);
  const ends = formData.getAll("day_end").map(String);
  return dates.map((date, i) => ({ date, start_time: starts[i], end_time: ends[i] }));
}

export async function saveClass(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  const days = readDays(formData);
  // The first day is the class date, so the form need not carry both.
  const first = days.map((d) => d.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0];
  if (first) formData.set("date", first);
  if (id) {
    if (!updateClass(db, id, formData)) {
      await flash("A title and date are required.", "error");
      return;
    }
    saveClassDays(db, id, days);
    const certId = String(formData.get("certification_id") ?? "");
    if (certId) attachCertificationCourses(db, id, certId);
    await flash("Class saved.");
    revalidatePath(`/classes/${id}`);
    revalidatePath("/classes");
    redirect(`/classes/${id}`);
  }
  const newId = createClass(db, formData, instructor());
  if (!newId) {
    await flash("A title and date are required.", "error");
    return;
  }
  saveClassDays(db, newId, days);
  const newCertId = String(formData.get("certification_id") ?? "");
  if (newCertId) attachCertificationCourses(db, newId, newCertId);
  await flash("Class created.");
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
