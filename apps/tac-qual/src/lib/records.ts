import type Database from "better-sqlite3-multiple-ciphers";

export type QualRow = {
  student_id: string;
  cof_id: string;
  course_code: string;
  course_name: string;
  runs: number;
  passes: number;
  best_percent: number | null;
  latest_percent: number | null;
  latest_passed: number | null;
  last_passed_date: string | null;
  last_run_date: string | null;
};

export function studentHistory(db: Database.Database, studentId: string) {
  return db
    .prepare(
      `select q.*, c.code as course_code, c.name as course_name
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
        where q.student_id = ?
        order by q.last_run_date desc, c.name`
    )
    .all(studentId) as QualRow[];
}

/**
 * Every student-course standing, with the class the latest run was scored
 * in. A qualification belongs to the student, not to one class — a student
 * can requalify in a later class — so the class is carried alongside for
 * sorting and searching rather than being what the record is keyed on.
 */
export function allQualifications(db: Database.Database) {
  return db
    .prepare(
      `select q.*, c.code as course_code, c.name as course_name,
              s.last_name, s.first_name,
              (select cl.number from score_runs r join classes cl on cl.id = r.class_id
                where r.student_id = q.student_id and r.cof_id = q.cof_id
                order by r.date desc, r.attempt desc, r.created_at desc limit 1) as class_number,
              (select cl.title from score_runs r join classes cl on cl.id = r.class_id
                where r.student_id = q.student_id and r.cof_id = q.cof_id
                order by r.date desc, r.attempt desc, r.created_at desc limit 1) as class_title
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
         join students s on s.id = q.student_id
        order by s.last_name, s.first_name, c.name`
    )
    .all() as (QualRow & {
    last_name: string;
    first_name: string;
    class_number: number | null;
    class_title: string | null;
  })[];
}

export function studentRuns(db: Database.Database, studentId: string) {
  return db
    .prepare(
      `select r.*, c.name as course_name, c.code as course_code,
              cl.number as class_number, cl.title as class_title
         from score_runs r
         join courses_of_fire c on c.id = r.cof_id
         join classes cl on cl.id = r.class_id
        where r.student_id = ?
        order by r.date desc, r.created_at desc`
    )
    .all(studentId) as {
    id: string;
    date: string;
    attempt: number;
    kind: string;
    total_points: number | null;
    final_score_percent: number | null;
    passing_score_percent: number | null;
    passed: number;
    course_name: string;
    course_code: string;
    class_number: number;
    class_title: string;
  }[];
}

export type CurrencyStatus = "current" | "due_soon" | "expired" | "never";

export type CurrencyRow = {
  student_id: string;
  last_name: string;
  first_name: string;
  cof_id: string;
  course_code: string;
  course_name: string;
  last_passed_date: string | null;
  expires_on: string | null;
  days_left: number | null;
  status: CurrencyStatus;
};

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const day = base.getUTCDate();
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + months);
  const lastOfMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, lastOfMonth));
  return base.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string) {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/**
 * Who is still current on each course they have ever been scored on, and who
 * is not. A student who has been scored but never passed is "never" rather
 * than expired — they have no currency to lose.
 */
export function qualificationCurrency(
  db: Database.Database,
  months: number,
  todayISO: string,
  dueSoonDays = 30
): CurrencyRow[] {
  const rows = db
    .prepare(
      `select q.student_id, q.cof_id, q.last_passed_date,
              c.code as course_code, c.name as course_name,
              s.last_name, s.first_name
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
         join students s on s.id = q.student_id
        where s.status = 'active'`
    )
    .all() as {
    student_id: string;
    cof_id: string;
    last_passed_date: string | null;
    course_code: string;
    course_name: string;
    last_name: string;
    first_name: string;
  }[];

  const out = rows.map((r) => {
    if (!r.last_passed_date) {
      return { ...r, expires_on: null, days_left: null, status: "never" as CurrencyStatus };
    }
    const expires_on = addMonths(r.last_passed_date, months);
    const days_left = daysBetween(todayISO, expires_on);
    const status: CurrencyStatus = days_left < 0 ? "expired" : days_left <= dueSoonDays ? "due_soon" : "current";
    return { ...r, expires_on, days_left, status };
  });

  const rank: Record<CurrencyStatus, number> = { expired: 0, due_soon: 1, never: 2, current: 3 };
  return out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.days_left ?? 1e9) - (b.days_left ?? 1e9) ||
      a.last_name.localeCompare(b.last_name)
  );
}

export function classArchive(db: Database.Database) {
  return db
    .prepare(
      `select cl.id, cl.number, cl.title, cl.date, cl.location, cl.status,
              (select count(*) from class_enrollment e where e.class_id = cl.id) as enrolled,
              (select count(distinct r.student_id) from score_runs r where r.class_id = cl.id) as scored,
              (select count(*) from score_runs r where r.class_id = cl.id) as runs,
              (select count(*) from score_runs r where r.class_id = cl.id and r.passed = 1) as passes
         from classes cl
        order by cl.date desc, cl.number desc`
    )
    .all() as {
    id: string;
    number: number;
    title: string;
    date: string;
    location: string | null;
    status: string;
    enrolled: number;
    scored: number;
    runs: number;
    passes: number;
  }[];
}
