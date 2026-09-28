import type Database from "better-sqlite3-multiple-ciphers";
import { addMonths, daysBetween } from "@core/lib/expiry";
import { holdings, listCertifications } from "@/lib/certifications";

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
  expires_months: number;
  last_passed_date: string | null;
  expires_on: string | null;
  days_left: number | null;
  status: CurrencyStatus;
};

/**
 * Currency for the courses that actually lapse.
 *
 * Expiry is a property of the course, not a global window (Brad, 2026-09-26):
 * most civilian certificates never expire, so a course with no
 * `expires_months` is left out entirely rather than being reported as
 * permanently current or never passed. A student who has been scored on an
 * expiring course but has never passed it reads as "never" — they have no
 * currency to lose.
 */
export function qualificationCurrency(db: Database.Database, todayISO: string, dueSoonDays = 30): CurrencyRow[] {
  const rows = db
    .prepare(
      `select q.student_id, q.cof_id, q.last_passed_date,
              c.code as course_code, c.name as course_name, c.expires_months,
              s.last_name, s.first_name
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
         join students s on s.id = q.student_id
        where s.status = 'active' and c.expires_months is not null`
    )
    .all() as {
    student_id: string;
    cof_id: string;
    last_passed_date: string | null;
    course_code: string;
    course_name: string;
    expires_months: number;
    last_name: string;
    first_name: string;
  }[];

  const out = rows.map((r) => {
    if (!r.last_passed_date) {
      return { ...r, expires_on: null, days_left: null, status: "never" as CurrencyStatus };
    }
    const expires_on = addMonths(r.last_passed_date, r.expires_months);
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

/** How many courses lapse at all — the Currency page says so when none do. */
export function expiringCourseCount(db: Database.Database) {
  return (
    db.prepare(`select count(*) as n from courses_of_fire where expires_months is not null`).get() as { n: number }
  ).n;
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

export type CredentialStatus = "expired" | "due_soon" | "current";

export type CredentialRow = {
  key: string;
  kind: "certification" | "course";
  credential_id: string;
  credential_name: string;
  credential_code: string | null;
  student_id: string;
  last_name: string;
  first_name: string;
  email: string | null;
  phone: string | null;
  earned_on: string | null;
  expires_on: string;
  days_left: number;
  status: CredentialStatus;
  certificate_number: number | null;
};

/**
 * One row per credential a student actually holds.
 *
 * A certification wherever one exists, and a course that expires and belongs
 * to no certification on its own. A student partway through a certification
 * is not here: they have nothing to renew yet, and the certification page
 * already shows what they are missing. A credential that never lapses is
 * left out entirely, because there is nothing to report about it.
 */
export function credentialCurrency(
  db: Database.Database,
  todayISO: string,
  dueSoonDays = 30
): CredentialRow[] {
  const contact = new Map(
    (db.prepare(`select id, email, phone from students`).all() as {
      id: string;
      email: string | null;
      phone: string | null;
    }[]).map((r) => [r.id, r])
  );

  const rank = (expires_on: string): { days_left: number; status: CredentialStatus } => {
    const days_left = daysBetween(todayISO, expires_on);
    return {
      days_left,
      status: days_left < 0 ? "expired" : days_left <= dueSoonDays ? "due_soon" : "current",
    };
  };

  const out: CredentialRow[] = [];

  const inACertification = new Set(
    (db.prepare(`select distinct cof_id from certification_courses`).all() as { cof_id: string }[]).map(
      (r) => r.cof_id
    )
  );

  for (const cert of listCertifications(db)) {
    for (const h of holdings(db, cert.id, todayISO)) {
      if (!h.complete || !h.expires_on) continue;
      const c = contact.get(h.student_id);
      out.push({
        key: `cert:${cert.id}:${h.student_id}`,
        kind: "certification",
        credential_id: cert.id,
        credential_name: cert.name,
        credential_code: cert.code,
        student_id: h.student_id,
        last_name: h.last_name,
        first_name: h.first_name,
        email: c?.email ?? null,
        phone: c?.phone ?? null,
        earned_on: h.earned_on,
        expires_on: h.expires_on,
        certificate_number: h.certificate_number,
        ...rank(h.expires_on),
      });
    }
  }

  const loose = db
    .prepare(
      `select q.student_id, q.cof_id, q.last_passed_date,
              c.code as course_code, c.name as course_name, c.expires_months,
              s.last_name, s.first_name
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
         join students s on s.id = q.student_id
        where s.status = 'active'
          and c.expires_months is not null
          and q.last_passed_date is not null`
    )
    .all() as {
    student_id: string;
    cof_id: string;
    last_passed_date: string;
    course_code: string | null;
    course_name: string;
    expires_months: number;
    last_name: string;
    first_name: string;
  }[];

  for (const r of loose) {
    if (inACertification.has(r.cof_id)) continue;
    const expires_on = addMonths(r.last_passed_date, r.expires_months);
    const c = contact.get(r.student_id);
    out.push({
      key: `course:${r.cof_id}:${r.student_id}`,
      kind: "course",
      credential_id: r.cof_id,
      credential_name: r.course_name,
      credential_code: r.course_code,
      student_id: r.student_id,
      last_name: r.last_name,
      first_name: r.first_name,
      email: c?.email ?? null,
      phone: c?.phone ?? null,
      earned_on: r.last_passed_date,
      expires_on,
      certificate_number: null,
      ...rank(expires_on),
    });
  }

  const order: Record<CredentialStatus, number> = { expired: 0, due_soon: 1, current: 2 };
  return out.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      a.days_left - b.days_left ||
      a.last_name.localeCompare(b.last_name) ||
      a.credential_name.localeCompare(b.credential_name)
  );
}
