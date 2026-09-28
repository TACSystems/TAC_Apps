
import { randomUUID } from "crypto";
import type { Migration } from "@core/lib/migrations";

// TAC-QUAL starts clean: SCHEMA_SQL creates the baseline, and migration 1
// records it so every later change gets a numbered step of its own.
export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: "baseline-0.1.0",
    up: () => {},
  },
  {
    id: 2,
    name: "checklist-0.2.0",
    up: () => {},
  },
  {
    // The five seeded courses shipped in 0.1.0 with a B-27 target but no
    // pass mark, so PASS/FAIL could not be decided on any of them. Only the
    // seeded codes are touched, and only where the user has not set one.
    id: 3,
    name: "seed-pass-marks-0.2.0",
    up: (db) => {
      db.prepare(
        `update courses_of_fire set passing_score_percent = 80
          where passing_score_percent is null
            and code in ('ENDUR-50', 'BH-50', 'MCO-50', 'US-50', 'CAQ-50 V 2.0')`
      ).run();
    },
  },
  {
    // A class carries a type, which is what the Classes page groups by. An
    // existing class has none and reads as Uncategorized until it is set.
    id: 4,
    name: "class-type-0.4.0",
    up: (db) => {
      const cols = db.prepare(`pragma table_info(classes)`).all() as { name: string }[];
      if (!cols.some((c) => c.name === "class_type")) {
        db.prepare(`alter table classes add column class_type text`).run();
      }
    },
  },
  {
    // Multi-day classes. Every existing class becomes a single day carrying
    // its own date, so nothing that reads classes.date changes behaviour.
    id: 5,
    name: "class-days-0.4.0",
    up: (db) => {
      const rows = db.prepare(`select id, date from classes`).all() as { id: string; date: string }[];
      const has = db.prepare(`select 1 from class_days where class_id = ? limit 1`);
      const ins = db.prepare(
        `insert into class_days (id, class_id, day_number, date) values (?, ?, 1, ?)`
      );
      db.transaction(() => {
        for (const r of rows) if (!has.get(r.id)) ins.run(randomUUID(), r.id, r.date);
      })();
    },
  },
  {
    // Expiry belongs to the course, not to a global window: most civilian
    // certificates do not lapse at all. Blank means never.
    id: 6,
    name: "course-expiry-0.4.0",
    up: (db) => {
      const cols = db.prepare(`pragma table_info(courses_of_fire)`).all() as { name: string }[];
      if (!cols.some((c) => c.name === "expires_months")) {
        db.prepare(`alter table courses_of_fire add column expires_months integer`).run();
      }
    },
  },
  {
    // Certifications: a named, ordered set of courses a student must pass.
    // Completion is computed from passing runs rather than recorded, so a
    // credential earned across more than one class needs no special path.
    // A certificate number is written at issue, which is what makes a
    // reprint carry the same number.
    id: 7,
    name: "certifications-0.5.0",
    up: (db) => {
      db.exec(`
        create table if not exists certifications (
          id text primary key,
          name text not null unique,
          code text,
          description text,
          certificate_title text,
          certificate_body text,
          sort_order integer not null default 0
        );

        create table if not exists certification_courses (
          id text primary key,
          certification_id text not null references certifications(id) on delete cascade,
          cof_id text not null references courses_of_fire(id) on delete cascade,
          sort_order integer not null default 0,
          unique (certification_id, cof_id)
        );

        create table if not exists certificates (
          id text primary key,
          number integer not null unique,
          student_id text not null references students(id) on delete cascade,
          certification_id text not null references certifications(id) on delete cascade,
          class_id text references classes(id) on delete set null,
          issued_on text not null,
          issued_by text,
          unique (student_id, certification_id)
        );
      `);
      const cols = db.prepare(`pragma table_info(classes)`).all() as { name: string }[];
      if (!cols.some((c) => c.name === "certification_id")) {
        db.prepare(
          `alter table classes add column certification_id text references certifications(id) on delete set null`
        ).run();
      }
    },
  },
];
