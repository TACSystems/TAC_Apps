import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { text, number as num, isoDate } from "@core/lib/forms";

export type Student = {
  id: string;
  last_name: string;
  first_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: "active" | "inactive" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
};

export type StudentFirearm = {
  id: string;
  student_id: string;
  make_model: string;
  caliber: string | null;
  serial_number: string | null;
  notes: string | null;
  sort_order: number;
};

export function studentName(s: { last_name: string; first_name: string }) {
  return `${s.last_name}, ${s.first_name}`;
}

export function listStudents(db: Database.Database, status?: Student["status"] | "all") {
  const where = !status || status === "all" ? "" : "where status = ?";
  const args = !status || status === "all" ? [] : [status];
  return db
    .prepare(
      `select s.*,
         (select count(*) from class_enrollment e where e.student_id = s.id) as classes_count,
         (select count(*) from score_runs r where r.student_id = s.id) as runs_count
       from students s ${where} order by s.last_name, s.first_name`
    )
    .all(...args) as (Student & { classes_count: number; runs_count: number })[];
}

export function getStudent(db: Database.Database, id: string) {
  return (db.prepare(`select * from students where id = ?`).get(id) as Student | undefined) ?? null;
}

export function studentFirearms(db: Database.Database, studentId: string) {
  return db
    .prepare(`select * from student_firearms where student_id = ? order by sort_order, make_model`)
    .all(studentId) as StudentFirearm[];
}

export type StudentInput = Partial<Record<string, unknown>> | FormData;

function readStudent(src: StudentInput) {
  const last = text(src, "last_name", 80);
  const first = text(src, "first_name", 80);
  if (!last || !first) return null;
  return {
    last_name: last,
    first_name: first,
    email: text(src, "email", 160),
    phone: text(src, "phone", 40),
    address: text(src, "address", 300),
    date_of_birth: isoDate(src, "date_of_birth"),
    emergency_contact_name: text(src, "emergency_contact_name", 120),
    emergency_contact_phone: text(src, "emergency_contact_phone", 40),
    notes: text(src, "notes", 2000),
    status: (["active", "inactive", "archived"] as const).includes(text(src, "status", 20) as never)
      ? (text(src, "status", 20) as Student["status"])
      : ("active" as const),
  };
}

export function createStudent(db: Database.Database, src: StudentInput, createdBy: string | null) {
  const v = readStudent(src);
  if (!v) return null;
  const id = randomUUID();
  db.prepare(
    `insert into students (id, last_name, first_name, email, phone, address, date_of_birth,
       emergency_contact_name, emergency_contact_phone, status, notes, created_by)
     values (@id, @last_name, @first_name, @email, @phone, @address, @date_of_birth,
       @emergency_contact_name, @emergency_contact_phone, @status, @notes, @created_by)`
  ).run({ id, ...v, created_by: createdBy });
  return id;
}

export function updateStudent(db: Database.Database, id: string, src: StudentInput) {
  const v = readStudent(src);
  if (!v) return false;
  const res = db
    .prepare(
      `update students set last_name = @last_name, first_name = @first_name, email = @email,
         phone = @phone, address = @address, date_of_birth = @date_of_birth,
         emergency_contact_name = @emergency_contact_name,
         emergency_contact_phone = @emergency_contact_phone,
         status = @status, notes = @notes, updated_at = datetime('now')
       where id = @id`
    )
    .run({ id, ...v });
  return res.changes > 0;
}

export function deleteStudent(db: Database.Database, id: string) {
  return db.prepare(`delete from students where id = ?`).run(id).changes > 0;
}

export function addStudentFirearm(db: Database.Database, studentId: string, src: StudentInput) {
  const makeModel = text(src, "make_model", 120);
  if (!makeModel) return null;
  const next = db
    .prepare(`select coalesce(max(sort_order), -1) + 1 as n from student_firearms where student_id = ?`)
    .get(studentId) as { n: number };
  const id = randomUUID();
  db.prepare(
    `insert into student_firearms (id, student_id, make_model, caliber, serial_number, notes, sort_order)
     values (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    studentId,
    makeModel,
    text(src, "caliber", 40),
    text(src, "serial_number", 60),
    text(src, "firearm_notes", 300),
    num(src, "sort_order", { int: true }) ?? next.n
  );
  return id;
}

export function deleteStudentFirearm(db: Database.Database, id: string) {
  return db.prepare(`delete from student_firearms where id = ?`).run(id).changes > 0;
}

/**
 * Import rows parsed from a CSV or spreadsheet. Matches on last+first name so
 * re-importing the same sheet updates rather than duplicating.
 */
export function importStudents(db: Database.Database, rows: Record<string, unknown>[], createdBy: string | null) {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const find = db.prepare(
    `select id from students where lower(last_name) = lower(?) and lower(first_name) = lower(?)`
  );
  db.transaction(() => {
    for (const row of rows) {
      const v = readStudent(row);
      if (!v) {
        skipped += 1;
        continue;
      }
      const hit = find.get(v.last_name, v.first_name) as { id: string } | undefined;
      if (hit) {
        updateStudent(db, hit.id, row);
        updated += 1;
      } else {
        createStudent(db, row, createdBy);
        added += 1;
      }
    }
  })();
  return { added, updated, skipped };
}
