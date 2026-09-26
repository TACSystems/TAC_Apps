import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { text, number as num, isoDate } from "@core/lib/forms";

export type ClassRow = {
  id: string;
  number: number;
  title: string;
  date: string;
  location: string | null;
  status: "planned" | "in_progress" | "complete";
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type ClassInstructor = {
  id: string;
  class_id: string;
  name: string;
  role: "lead" | "assistant" | "grader";
  sort_order: number;
};

export type Enrolled = {
  id: string;
  class_id: string;
  student_id: string;
  relay: number | null;
  lane: number | null;
  notes: string | null;
  last_name: string;
  first_name: string;
};

export function classNumberLabel(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

function nextClassNumber(db: Database.Database) {
  const row = db.prepare(`select coalesce(max(number), 0) + 1 as n from classes`).get() as { n: number };
  return row.n;
}

export function listClasses(db: Database.Database) {
  return db
    .prepare(
      `select c.*,
         (select count(*) from class_enrollment e where e.class_id = c.id) as students,
         (select count(*) from class_courses cc where cc.class_id = c.id) as courses,
         (select count(*) from score_runs r where r.class_id = c.id) as runs
       from classes c order by c.date desc, c.number desc`
    )
    .all() as (ClassRow & { students: number; courses: number; runs: number })[];
}

export function getClass(db: Database.Database, id: string) {
  return (db.prepare(`select * from classes where id = ?`).get(id) as ClassRow | undefined) ?? null;
}

export function classInstructors(db: Database.Database, classId: string) {
  return db
    .prepare(`select * from class_instructors where class_id = ? order by sort_order, name`)
    .all(classId) as ClassInstructor[];
}

export function classCourses(db: Database.Database, classId: string) {
  return db
    .prepare(
      `select cc.id, cc.cof_id, cc.sort_order, c.code, c.name, c.passing_score_percent, c.total_rounds
         from class_courses cc join courses_of_fire c on c.id = cc.cof_id
        where cc.class_id = ? order by cc.sort_order, c.name`
    )
    .all(classId) as {
    id: string;
    cof_id: string;
    sort_order: number;
    code: string;
    name: string;
    passing_score_percent: number | null;
    total_rounds: number | null;
  }[];
}

export function enrollment(db: Database.Database, classId: string) {
  return db
    .prepare(
      `select e.*, s.last_name, s.first_name
         from class_enrollment e join students s on s.id = e.student_id
        where e.class_id = ?
        order by coalesce(e.relay, 9999), coalesce(e.lane, 9999), s.last_name, s.first_name`
    )
    .all(classId) as Enrolled[];
}

export function relays(db: Database.Database, classId: string) {
  const rows = enrollment(db, classId);
  const map = new Map<number | null, Enrolled[]>();
  for (const r of rows) {
    const key = r.relay ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()].sort((a, b) => (a[0] ?? 9999) - (b[0] ?? 9999));
}

type Src = Partial<Record<string, unknown>> | FormData;

function readClass(src: Src) {
  const title = text(src, "title", 140);
  const date = isoDate(src, "date");
  if (!title || !date) return null;
  const status = text(src, "status", 20);
  return {
    title,
    date,
    location: text(src, "location", 160),
    status: (["planned", "in_progress", "complete"] as const).includes(status as never)
      ? (status as ClassRow["status"])
      : ("planned" as const),
    notes: text(src, "notes", 2000),
  };
}

export function createClass(db: Database.Database, src: Src, createdBy: string | null) {
  const v = readClass(src);
  if (!v) return null;
  const id = randomUUID();
  db.prepare(
    `insert into classes (id, number, title, date, location, status, notes, created_by)
     values (@id, @number, @title, @date, @location, @status, @notes, @created_by)`
  ).run({ id, number: nextClassNumber(db), ...v, created_by: createdBy });
  return id;
}

/**
 * A new class carrying the same courses of fire and credited instructors.
 * The roster, relays and scores are deliberately left behind — those belong
 * to the class that was actually run.
 */
export function duplicateClass(
  db: Database.Database,
  sourceId: string,
  src: Src,
  createdBy: string | null
): string | null {
  const source = getClass(db, sourceId);
  if (!source) return null;
  const courses = classCourses(db, sourceId);
  const instructors = classInstructors(db, sourceId);
  let newId: string | null = null;
  db.transaction(() => {
    newId = createClass(db, src, createdBy);
    if (!newId) return;
    for (const c of courses) addCourse(db, newId, c.cof_id);
    for (const i of instructors) addInstructor(db, newId, i.name, i.role);
  })();
  return newId;
}

export function updateClass(db: Database.Database, id: string, src: Src) {
  const v = readClass(src);
  if (!v) return false;
  return (
    db
      .prepare(
        `update classes set title = @title, date = @date, location = @location,
           status = @status, notes = @notes where id = @id`
      )
      .run({ id, ...v }).changes > 0
  );
}

export function deleteClass(db: Database.Database, id: string) {
  return db.prepare(`delete from classes where id = ?`).run(id).changes > 0;
}

export function addInstructor(db: Database.Database, classId: string, name: string, role: ClassInstructor["role"]) {
  const next = db
    .prepare(`select coalesce(max(sort_order), -1) + 1 as n from class_instructors where class_id = ?`)
    .get(classId) as { n: number };
  db.prepare(`insert into class_instructors (id, class_id, name, role, sort_order) values (?, ?, ?, ?, ?)`).run(
    randomUUID(),
    classId,
    name,
    role,
    next.n
  );
}

export function removeInstructor(db: Database.Database, id: string) {
  db.prepare(`delete from class_instructors where id = ?`).run(id);
}

export function addCourse(db: Database.Database, classId: string, cofId: string) {
  const next = db
    .prepare(`select coalesce(max(sort_order), -1) + 1 as n from class_courses where class_id = ?`)
    .get(classId) as { n: number };
  db.prepare(
    `insert or ignore into class_courses (id, class_id, cof_id, sort_order) values (?, ?, ?, ?)`
  ).run(randomUUID(), classId, cofId, next.n);
}

export function removeCourse(db: Database.Database, id: string) {
  db.prepare(`delete from class_courses where id = ?`).run(id);
}

export function enroll(db: Database.Database, classId: string, studentId: string, src?: Src) {
  db.prepare(
    `insert or ignore into class_enrollment (id, class_id, student_id, relay, lane) values (?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    classId,
    studentId,
    src ? num(src, "relay", { int: true, min: 1, max: 99 }) : null,
    src ? num(src, "lane", { int: true, min: 1, max: 99 }) : null
  );
}

export function unenroll(db: Database.Database, id: string) {
  db.prepare(`delete from class_enrollment where id = ?`).run(id);
}

export function setRelayLane(db: Database.Database, id: string, relay: number | null, lane: number | null) {
  db.prepare(`update class_enrollment set relay = ?, lane = ? where id = ?`).run(relay, lane, id);
}

/** Spread everyone not yet assigned into relays of `size`, filling lanes in order. */
export function autoAssignRelays(db: Database.Database, classId: string, size: number) {
  const rows = enrollment(db, classId);
  const stmt = db.prepare(`update class_enrollment set relay = ?, lane = ? where id = ?`);
  db.transaction(() => {
    rows.forEach((r, i) => {
      stmt.run(Math.floor(i / size) + 1, (i % size) + 1, r.id);
    });
  })();
  return rows.length;
}
