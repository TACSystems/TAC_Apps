"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  addStudentFirearm,
  createStudent,
  deleteStudent,
  deleteStudentFirearm,
  updateStudent,
} from "@/lib/students";

function instructor() {
  return getSettings(getDb()).instructorName || null;
}

export async function saveStudent(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  if (id) {
    if (!updateStudent(db, id, formData)) {
      await flash("A first and last name are required.", "error");
      return;
    }
    await flash("Student saved.");
    revalidatePath(`/students/${id}`);
    redirect(`/students/${id}`);
  }
  const newId = createStudent(db, formData, instructor());
  if (!newId) {
    await flash("A first and last name are required.", "error");
    return;
  }
  await flash("Student added.");
  revalidatePath("/students");
  redirect(`/students/${newId}`);
}

export async function removeStudent(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  deleteStudent(db, id);
  await flash("Student deleted.");
  revalidatePath("/students");
  redirect("/students");
}

export async function addFirearm(formData: FormData) {
  const db = getDb();
  const studentId = String(formData.get("student_id") ?? "");
  if (!addStudentFirearm(db, studentId, formData)) {
    await flash("A make and model is required.", "error");
  } else {
    await flash("Firearm added.");
  }
  revalidatePath(`/students/${studentId}`);
}

export async function removeFirearm(formData: FormData) {
  const db = getDb();
  const studentId = String(formData.get("student_id") ?? "");
  deleteStudentFirearm(db, String(formData.get("id") ?? ""));
  await flash("Firearm removed.");
  revalidatePath(`/students/${studentId}`);
}
