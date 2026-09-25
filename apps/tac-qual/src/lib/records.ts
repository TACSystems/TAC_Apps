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

export function allQualifications(db: Database.Database) {
  return db
    .prepare(
      `select q.*, c.code as course_code, c.name as course_name,
              s.last_name, s.first_name
         from student_qualifications q
         join courses_of_fire c on c.id = q.cof_id
         join students s on s.id = q.student_id
        order by s.last_name, s.first_name, c.name`
    )
    .all() as (QualRow & { last_name: string; first_name: string })[];
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
