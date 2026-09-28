import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { certificationCourses, getCertification, holdings, type Holding } from "@/lib/certifications";

export type IssuedCertificate = {
  id: string;
  number: number;
  student_id: string;
  certification_id: string;
  class_id: string | null;
  issued_on: string;
  issued_by: string | null;
};

export type ClassCertificateRow = Holding & {
  state: "complete_issued" | "complete_not_issued" | "incomplete";
  missing_labels: string[];
};

function nextNumber(db: Database.Database) {
  return (db.prepare(`select coalesce(max(number), 0) + 1 as n from certificates`).get() as { n: number }).n;
}

/**
 * The enrolled students of a class, against the certification the class is
 * taught from, in one of three states. A student is never in two.
 */
export function classCertificateRows(
  db: Database.Database,
  classId: string,
  certificationId: string,
  todayISO: string
): ClassCertificateRow[] {
  const enrolled = new Set(
    (db.prepare(`select student_id from class_enrollment where class_id = ?`).all(classId) as {
      student_id: string;
    }[]).map((r) => r.student_id)
  );
  const courses = certificationCourses(db, certificationId);
  const label = new Map(courses.map((c) => [c.cof_id, c.code || c.name]));

  return holdings(db, certificationId, todayISO)
    .filter((h) => enrolled.has(h.student_id))
    .map((h) => ({
      ...h,
      state: !h.complete
        ? ("incomplete" as const)
        : h.certificate_number !== null
          ? ("complete_issued" as const)
          : ("complete_not_issued" as const),
      missing_labels: h.missing.map((m) => label.get(m) ?? m),
    }));
}

/**
 * Numbers are written at issue, never derived at print time, which is what
 * makes a reprint carry the same number. A student who already holds a
 * certificate for this certification keeps the one they have.
 */
export function issueCertificates(
  db: Database.Database,
  classId: string,
  certificationId: string,
  todayISO: string,
  issuedBy: string | null
) {
  const rows = classCertificateRows(db, classId, certificationId, todayISO).filter(
    (r) => r.state === "complete_not_issued"
  );
  if (rows.length === 0) return { issued: 0 };

  const insert = db.prepare(
    `insert into certificates (id, number, student_id, certification_id, class_id, issued_on, issued_by)
     values (?, ?, ?, ?, ?, ?, ?)`
  );
  let issued = 0;
  db.transaction(() => {
    for (const r of rows) {
      insert.run(randomUUID(), nextNumber(db), r.student_id, certificationId, classId, todayISO, issuedBy);
      issued += 1;
    }
  })();
  return { issued };
}

/**
 * What the print sheet renders. It reads only certificates that have been
 * issued, so loading the URL cannot mint a number.
 */
export function certificatesForPrint(db: Database.Database, classId: string, certificationId: string) {
  const cert = getCertification(db, certificationId);
  if (!cert) return null;
  const rows = db
    .prepare(
      `select c.*, s.last_name, s.first_name
         from certificates c
         join students s on s.id = c.student_id
        where c.class_id = ? and c.certification_id = ?
        order by c.number`
    )
    .all(classId, certificationId) as (IssuedCertificate & { last_name: string; first_name: string })[];
  return { certification: cert, courses: certificationCourses(db, certificationId), rows };
}

export function studentCertificate(db: Database.Database, studentId: string, certificationId: string) {
  return (
    (db
      .prepare(`select * from certificates where student_id = ? and certification_id = ?`)
      .get(studentId, certificationId) as IssuedCertificate | undefined) ?? null
  );
}
