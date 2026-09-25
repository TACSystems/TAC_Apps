"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@core/lib/flash";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { importStudents } from "@/lib/students";

const HEADER_MAP: Record<string, string> = {
  "last name": "last_name",
  lastname: "last_name",
  last: "last_name",
  surname: "last_name",
  "first name": "first_name",
  firstname: "first_name",
  first: "first_name",
  email: "email",
  "e-mail": "email",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  address: "address",
  "date of birth": "date_of_birth",
  dob: "date_of_birth",
  notes: "notes",
  "emergency contact": "emergency_contact_name",
  "emergency name": "emergency_contact_name",
  "emergency phone": "emergency_contact_phone",
};

/** Minimal RFC-4180 reader: quoted fields, doubled quotes, embedded commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Splits "Reyes, Marisol" or "Marisol Reyes" when there is one name column. */
function splitName(value: string) {
  const v = value.trim();
  if (v.includes(",")) {
    const [last, first] = v.split(",", 2);
    return { last_name: last.trim(), first_name: (first ?? "").trim() };
  }
  const parts = v.split(/\s+/);
  if (parts.length === 1) return { last_name: parts[0], first_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}

export async function importStudentsAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    await flash("Choose a CSV file.", "error");
    return;
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    await flash("That file has no rows under its header.", "error");
    return;
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const nameOnly = !headers.some((h) => HEADER_MAP[h] === "last_name");

  const records = rows.slice(1).map((cells) => {
    const rec: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const key = HEADER_MAP[h];
      const value = (cells[i] ?? "").trim();
      if (key) rec[key] = value;
      else if (nameOnly && (h === "name" || h === "student")) Object.assign(rec, splitName(value));
    });
    return rec;
  });

  const db = getDb();
  const { added, updated, skipped } = importStudents(db, records, getSettings(db).instructorName || null);

  await flash(
    `${added} added, ${updated} updated${skipped ? `, ${skipped} skipped (no name)` : ""}.`,
    added || updated ? "ok" : "error"
  );
  revalidatePath("/students");
  if (added || updated) redirect("/students");
}
