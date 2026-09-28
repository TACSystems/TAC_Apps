import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { addMonths, daysBetween } from "@core/lib/expiry";

export type Certification = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  certificate_title: string | null;
  certificate_body: string | null;
  sort_order: number;
};

export type CertificationCourse = {
  cof_id: string;
  code: string | null;
  name: string;
  expires_months: number | null;
  sort_order: number;
};

export type CertificationInput = {
  id?: string;
  name: string;
  code: string | null;
  description: string | null;
  certificate_title: string | null;
  certificate_body: string | null;
  cofIds: string[];
};

export type Holding = {
  student_id: string;
  last_name: string;
  first_name: string;
  certification_id: string;
  passed: string[];
  missing: string[];
  complete: boolean;
  earned_on: string | null;
  expires_on: string | null;
  days_left: number | null;
  certificate_number: number | null;
  issued_on: string | null;
};

export function courseOptions(db: Database.Database) {
  return db
    .prepare(`select id, code, name, expires_months from courses_of_fire order by name`)
    .all() as { id: string; code: string | null; name: string; expires_months: number | null }[];
}

export function listCertifications(db: Database.Database) {
  return db
    .prepare(
      `select c.*,
              (select count(*) from certification_courses cc where cc.certification_id = c.id) as course_count,
              (select count(*) from certificates ct where ct.certification_id = c.id) as issued_count
         from certifications c
        order by c.sort_order, c.name`
    )
    .all() as (Certification & { course_count: number; issued_count: number })[];
}

export function getCertification(db: Database.Database, id: string) {
  return (db.prepare(`select * from certifications where id = ?`).get(id) as Certification | undefined) ?? null;
}

export function certificationCourses(db: Database.Database, id: string) {
  return db
    .prepare(
      `select cc.cof_id, cc.sort_order, c.code, c.name, c.expires_months
         from certification_courses cc
         join courses_of_fire c on c.id = cc.cof_id
        where cc.certification_id = ?
        order by cc.sort_order`
    )
    .all(id) as CertificationCourse[];
}

export function saveCertification(db: Database.Database, input: CertificationInput) {
  const id = input.id ?? randomUUID();
  db.transaction(() => {
    if (input.id) {
      db.prepare(
        `update certifications
            set name = ?, code = ?, description = ?, certificate_title = ?, certificate_body = ?
          where id = ?`
      ).run(input.name, input.code, input.description, input.certificate_title, input.certificate_body, id);
    } else {
      const next = (
        db.prepare(`select coalesce(max(sort_order), -1) + 1 as n from certifications`).get() as { n: number }
      ).n;
      db.prepare(
        `insert into certifications (id, name, code, description, certificate_title, certificate_body, sort_order)
         values (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, input.name, input.code, input.description, input.certificate_title, input.certificate_body, next);
    }

    db.prepare(`delete from certification_courses where certification_id = ?`).run(id);
    const ins = db.prepare(
      `insert into certification_courses (id, certification_id, cof_id, sort_order) values (?, ?, ?, ?)`
    );
    input.cofIds.forEach((cofId, i) => ins.run(randomUUID(), id, cofId, i));
  })();
  return id;
}

export function deleteCertification(db: Database.Database, id: string) {
  db.prepare(`delete from certifications where id = ?`).run(id);
}

/**
 * A student holds a certification the moment they have a passing run on
 * every course in it, from any class on any date. The oldest of those
 * passes sets the expiry, because that is the one that lapses first.
 */
export function holdings(db: Database.Database, certificationId: string, todayISO: string): Holding[] {
  const courses = certificationCourses(db, certificationId);
  if (courses.length === 0) return [];

  const rows = db
    .prepare(
      `select q.student_id, q.cof_id, q.last_passed_date, s.last_name, s.first_name
         from student_qualifications q
         join students s on s.id = q.student_id
        where q.cof_id in (${courses.map(() => "?").join(",")})
          and q.last_passed_date is not null
          and s.status = 'active'`
    )
    .all(...courses.map((c) => c.cof_id)) as {
    student_id: string;
    cof_id: string;
    last_passed_date: string;
    last_name: string;
    first_name: string;
  }[];

  const issued = db
    .prepare(`select student_id, number, issued_on from certificates where certification_id = ?`)
    .all(certificationId) as { student_id: string; number: number; issued_on: string }[];
  const issuedBy = new Map(issued.map((c) => [c.student_id, c]));

  const byStudent = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byStudent.get(r.student_id) ?? [];
    list.push(r);
    byStudent.set(r.student_id, list);
  }

  const months = new Map(courses.map((c) => [c.cof_id, c.expires_months]));

  const out: Holding[] = [];
  for (const [studentId, list] of byStudent) {
    const passed = list.map((r) => r.cof_id);
    const missing = courses.filter((c) => !passed.includes(c.cof_id)).map((c) => c.cof_id);
    const complete = missing.length === 0;

    let earned_on: string | null = null;
    let expires_on: string | null = null;
    if (complete) {
      earned_on = list.map((r) => r.last_passed_date).sort().at(-1) ?? null;
      const dates = list
        .map((r) => {
          const m = months.get(r.cof_id);
          return m == null ? null : addMonths(r.last_passed_date, m);
        })
        .filter((d): d is string => d !== null)
        .sort();
      expires_on = dates[0] ?? null;
    }

    const cert = issuedBy.get(studentId) ?? null;
    out.push({
      student_id: studentId,
      last_name: list[0].last_name,
      first_name: list[0].first_name,
      certification_id: certificationId,
      passed,
      missing,
      complete,
      earned_on,
      expires_on,
      days_left: expires_on ? daysBetween(todayISO, expires_on) : null,
      certificate_number: cert?.number ?? null,
      issued_on: cert?.issued_on ?? null,
    });
  }

  return out.sort(
    (a, b) =>
      Number(b.complete) - Number(a.complete) ||
      a.last_name.localeCompare(b.last_name) ||
      a.first_name.localeCompare(b.first_name)
  );
}

export function studentCertifications(db: Database.Database, studentId: string, todayISO: string) {
  const certs = listCertifications(db);
  return certs
    .map((c) => ({ certification: c, holding: holdings(db, c.id, todayISO).find((h) => h.student_id === studentId) }))
    .filter((r) => r.holding !== undefined)
    .map((r) => ({ certification: r.certification, holding: r.holding! }));
}
