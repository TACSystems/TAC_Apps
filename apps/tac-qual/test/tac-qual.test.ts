import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3-multiple-ciphers";
import { SCHEMA_SQL, VIEWS_SQL } from "@/lib/db/schema";
import { runMigrations } from "@core/lib/migrations";
import { scoreFromCounts, saveRelayScores, courseMeta, latestAttempt, classResults } from "@/lib/scoring";
import {
  addCourse,
  addInstructor,
  autoAssignRelays,
  classCourses,
  classInstructors,
  createClass,
  duplicateClass,
  enroll,
  enrollment,
  relays,
} from "@/lib/classes";
import { createStudent, importStudents, listStudents } from "@/lib/students";
import { studentHistory } from "@/lib/records";

function fresh() {
  const db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
  runMigrations(db, [{ id: 1, name: "baseline-0.1.0", up: () => {} }]);
  db.exec(VIEWS_SQL);
  return db;
}

/** A 50-round course on a 3-zone target: A=5, B=3, C=1 → 250 possible, 80% to pass. */
function seedCourse(db: Database.Database) {
  db.prepare(`insert into target_types (id, name) values ('t1', 'Q Target')`).run();
  const zones: [string, number, number][] = [
    ["A", 5, 0],
    ["B", 3, 1],
    ["C", 1, 2],
  ];
  for (const [label, value, order] of zones) {
    db.prepare(
      `insert into target_type_zones (id, target_type_id, zone_label, value, sort_order) values (?, 't1', ?, ?, ?)`
    ).run(`z${label}`, label, value, order);
  }
  db.prepare(
    `insert into courses_of_fire (id, code, name, total_rounds, target_type_id, passing_score_percent)
     values ('c1', 'CDH-1', 'Civilian Defensive Handgun', 50, 't1', 80)`
  ).run();
  return "c1";
}

test("score from counts: points, rounds and percent against the course maximum", () => {
  const zones = [
    { zone_label: "A", value: 5 },
    { zone_label: "B", value: 3 },
    { zone_label: "C", value: 1 },
  ];
  const max = 250;

  assert.deepEqual(scoreFromCounts({ A: 50 }, zones, max), { points: 250, rounds: 50, percent: 100 });
  assert.deepEqual(scoreFromCounts({ A: 38, B: 9, C: 2 }, zones, max), { points: 219, rounds: 49, percent: 87.6 });
  assert.deepEqual(scoreFromCounts({}, zones, max), { points: 0, rounds: 0, percent: 0 });

  // Negative and fractional entries are clamped and rounded, never trusted raw.
  assert.deepEqual(scoreFromCounts({ A: -5, B: 2.4 }, zones, max), { points: 6, rounds: 2, percent: 2.4 });

  // No maximum (course has no rounds set) gives no percent rather than a divide by zero.
  assert.equal(scoreFromCounts({ A: 10 }, zones, 0).percent, null);
});

test("course meta reads zones, maximum and pass mark", () => {
  const db = fresh();
  seedCourse(db);
  const meta = courseMeta(db, "c1");
  assert.ok(meta);
  assert.equal(meta!.maxPoints, 250);
  assert.equal(meta!.passing, 80);
  assert.equal(meta!.totalRounds, 50);
  assert.deepEqual(
    meta!.zones.map((z) => z.zone_label),
    ["A", "B", "C"]
  );
});

test("a course built in the app scores from its strings when total_rounds is null", () => {
  const db = fresh();
  seedCourse(db);
  // The builder leaves total_rounds null when the phases add up on their own.
  db.prepare(`update courses_of_fire set total_rounds = null where id = 'c1'`).run();
  db.prepare(`insert into cof_phases (id, cof_id, phase_number, title) values ('p1', 'c1', 1, 'Phase 1')`).run();
  const ins = db.prepare(
    `insert into cof_strings (id, phase_id, sort_order, row_type, string_number, rounds) values (?, 'p1', ?, 'string', ?, ?)`
  );
  ins.run("s1", 0, 1, "20");
  ins.run("s2", 1, 2, "20");
  ins.run("s3", 2, 3, "10");

  const meta = courseMeta(db, "c1");
  assert.equal(meta!.totalRounds, 50, "rounds come from the strings");
  assert.equal(meta!.maxPoints, 250, "and the maximum is not zero");
});

test("saving a relay: blank rows are skipped, not stored as zeros", () => {
  const db = fresh();
  seedCourse(db);
  const classId = createClass(db, { title: "Class", date: "2026-09-25" }, "Brad")!;
  const pass = createStudent(db, { last_name: "Reyes", first_name: "M" }, null)!;
  const fail = createStudent(db, { last_name: "Lindqvist", first_name: "A" }, null)!;
  const absent = createStudent(db, { last_name: "Absent", first_name: "B" }, null)!;
  for (const s of [pass, fail, absent]) enroll(db, classId, s);
  addCourse(db, classId, "c1");

  const res = saveRelayScores(db, {
    classId,
    cofId: "c1",
    date: "2026-09-25",
    attempt: 1,
    kind: "qual",
    scoredBy: "Brad",
    entries: [
      { studentId: pass, counts: { A: 45, B: 5 } },
      { studentId: fail, counts: { A: 20, B: 10, C: 10 } },
      { studentId: absent, counts: {} },
    ],
  });

  assert.equal(res.saved, 2);
  assert.equal(res.skipped, 1);

  const runs = classResults(db, classId, "c1");
  assert.equal(runs.length, 2);

  const passRun = runs.find((r) => r.student_id === pass)!;
  assert.equal(passRun.total_points, 240);
  assert.equal(passRun.final_score_percent, 96);
  assert.equal(passRun.passed, 1);
  assert.equal(passRun.rounds_counted, 50);

  const failRun = runs.find((r) => r.student_id === fail)!;
  assert.equal(failRun.total_points, 140);
  assert.equal(failRun.final_score_percent, 56);
  assert.equal(failRun.passed, 0);

  // The absent student has no run at all — not a zero, not a fail.
  assert.equal(runs.some((r) => r.student_id === absent), false);
});

test("re-saving the same attempt replaces it; a second attempt is a new row", () => {
  const db = fresh();
  seedCourse(db);
  const classId = createClass(db, { title: "Class", date: "2026-09-25" }, null)!;
  const student = createStudent(db, { last_name: "Okafor", first_name: "D" }, null)!;
  enroll(db, classId, student);

  const save = (attempt: number, counts: Record<string, number>, kind: "qual" | "remedial") =>
    saveRelayScores(db, {
      classId,
      cofId: "c1",
      date: "2026-09-25",
      attempt,
      kind,
      scoredBy: null,
      entries: [{ studentId: student, counts }],
    });

  save(1, { A: 20, B: 10 }, "qual");
  save(1, { A: 25, B: 10 }, "qual"); // correcting a mis-keyed score
  let runs = classResults(db, classId, "c1");
  assert.equal(runs.length, 1, "correcting an attempt replaces it rather than adding a row");
  assert.equal(runs[0].total_points, 155);

  save(2, { A: 45, B: 5 }, "remedial");
  runs = classResults(db, classId, "c1");
  assert.equal(runs.length, 2, "a remedial run is kept alongside the failed attempt");
  assert.equal(latestAttempt(db, classId, student, "c1"), 2);

  const history = studentHistory(db, student);
  assert.equal(history.length, 1);
  assert.equal(history[0].runs, 2);
  assert.equal(history[0].passes, 1);
  assert.equal(history[0].best_percent, 96);
  assert.equal(history[0].latest_passed, 1, "latest is the remedial pass, not the earlier fail");
  assert.equal(history[0].last_passed_date, "2026-09-25");
});

test("auto-assigning relays fills lanes in order", () => {
  const db = fresh();
  const classId = createClass(db, { title: "Class", date: "2026-09-25" }, null)!;
  for (const n of ["A", "B", "C", "D", "E", "F", "G"]) {
    enroll(db, classId, createStudent(db, { last_name: n, first_name: n }, null)!);
  }

  assert.equal(autoAssignRelays(db, classId, 3), 7);
  const grouped = relays(db, classId);
  assert.deepEqual(
    grouped.map(([relay, rows]) => [relay, rows.length]),
    [
      [1, 3],
      [2, 3],
      [3, 1],
    ]
  );
  assert.deepEqual(grouped[0][1].map((r) => r.lane), [1, 2, 3]);
  assert.deepEqual(grouped[2][1].map((r) => r.lane), [1]);
});

test("importing students updates a matching name instead of duplicating", () => {
  const db = fresh();
  const rows = [
    { last_name: "Reyes", first_name: "Marisol", email: "m@example.test" },
    { last_name: "Whitaker", first_name: "Jo" },
    { first_name: "NoLastName" },
  ];
  let res = importStudents(db, rows, null);
  assert.deepEqual(res, { added: 2, updated: 0, skipped: 1 });

  res = importStudents(db, [{ last_name: "reyes", first_name: "MARISOL", phone: "555-0100" }], null);
  assert.deepEqual(res, { added: 0, updated: 1, skipped: 0 }, "name match ignores case");

  const all = listStudents(db, "all");
  assert.equal(all.length, 2);
  assert.equal(all.find((s) => s.last_name === "reyes")?.phone, "555-0100");
});

test("a class gets the next number and keeps it unique", () => {
  const db = fresh();
  const a = createClass(db, { title: "First", date: "2026-01-01" }, null)!;
  const b = createClass(db, { title: "Second", date: "2026-02-01" }, null)!;
  const numbers = db.prepare(`select number from classes order by number`).all() as { number: number }[];
  assert.deepEqual(numbers, [{ number: 1 }, { number: 2 }]);
  assert.notEqual(a, b);

  // A class with no title or no date is refused rather than half-created.
  assert.equal(createClass(db, { title: "", date: "2026-03-01" }, null), null);
  assert.equal(createClass(db, { title: "No date", date: "" }, null), null);
  assert.equal((db.prepare(`select count(*) as n from classes`).get() as { n: number }).n, 2);
});

test("deleting a class removes its runs but leaves the students", () => {
  const db = fresh();
  seedCourse(db);
  const classId = createClass(db, { title: "Class", date: "2026-09-25" }, null)!;
  const student = createStudent(db, { last_name: "Marchetti", first_name: "L" }, null)!;
  enroll(db, classId, student);
  saveRelayScores(db, {
    classId,
    cofId: "c1",
    date: "2026-09-25",
    attempt: 1,
    kind: "qual",
    scoredBy: null,
    entries: [{ studentId: student, counts: { A: 40, B: 10 } }],
  });

  db.prepare(`delete from classes where id = ?`).run(classId);
  assert.equal((db.prepare(`select count(*) as n from score_runs`).get() as { n: number }).n, 0);
  assert.equal((db.prepare(`select count(*) as n from score_zone_counts`).get() as { n: number }).n, 0);
  assert.equal(listStudents(db, "all").length, 1, "the student stays on the roster");
});

test("duplicating a class copies its courses and instructors, not its roster or scores", () => {
  const db = fresh();
  seedCourse(db);
  const classId = createClass(db, { title: "Defensive Handgun L1", date: "2026-09-25", location: "Blackwater" }, "Brad")!;
  addCourse(db, classId, "c1");
  addInstructor(db, classId, "M. Reyes", "lead");
  addInstructor(db, classId, "A. Okafor", "assistant");
  const student = createStudent(db, { last_name: "Lindqvist", first_name: "A" }, null)!;
  enroll(db, classId, student);
  saveRelayScores(db, {
    classId,
    cofId: "c1",
    date: "2026-09-25",
    attempt: 1,
    kind: "qual",
    scoredBy: null,
    entries: [{ studentId: student, counts: { A: 45, B: 5 } }],
  });

  const copyId = duplicateClass(db, classId, { title: "Defensive Handgun L1", date: "2026-10-09" }, "Brad")!;
  assert.ok(copyId);
  assert.notEqual(copyId, classId);

  assert.deepEqual(
    classCourses(db, copyId).map((c) => c.cof_id),
    ["c1"],
    "the course of fire comes across"
  );
  assert.deepEqual(
    classInstructors(db, copyId).map((i) => [i.name, i.role]),
    [["M. Reyes", "lead"], ["A. Okafor", "assistant"]],
    "credited instructors come across with their roles"
  );
  assert.equal(enrollment(db, copyId).length, 0, "the roster stays with the class that was run");
  assert.equal(
    (db.prepare(`select count(*) as n from score_runs where class_id = ?`).get(copyId) as { n: number }).n,
    0,
    "no scores are copied"
  );

  // The copy is a class in its own right: its own number, its own date.
  const rows = db.prepare(`select number, date from classes order by number`).all() as { number: number; date: string }[];
  assert.deepEqual(rows, [
    { number: 1, date: "2026-09-25" },
    { number: 2, date: "2026-10-09" },
  ]);

  // The original is untouched.
  assert.equal(enrollment(db, classId).length, 1);
  assert.equal(classResults(db, classId, "c1").length, 1);
});

test("duplicating refuses a class that does not exist, and a copy with no date", () => {
  const db = fresh();
  const classId = createClass(db, { title: "Class", date: "2026-09-25" }, null)!;
  assert.equal(duplicateClass(db, "nope", { title: "X", date: "2026-10-01" }, null), null);
  assert.equal(duplicateClass(db, classId, { title: "X", date: "" }, null), null);
  assert.equal((db.prepare(`select count(*) as n from classes`).get() as { n: number }).n, 1, "nothing half-created");
});
