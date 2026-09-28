/** Seeds a TAC-QUAL database the browser suites can work against.
 *  Two target zones, three courses (one expiring), four students, one class. */
const Database = require("better-sqlite3-multiple-ciphers");
const { randomUUID } = require("crypto");

const db = new Database(process.argv[2]);
db.pragma("foreign_keys = ON");

db.prepare(`insert into target_types (id, name) values ('t1', 'Q Target')`).run();
const zones = [["A", 5, 0], ["B", 3, 1], ["C", 1, 2]];
for (const [label, value, order] of zones) {
  db.prepare(
    `insert into target_type_zones (id, target_type_id, zone_label, value, sort_order) values (?, 't1', ?, ?, ?)`
  ).run(`z${label}`, label, value, order);
}

const courses = [
  ["c1", "CDH-1", "Civilian Defensive Handgun", 10, 80, null],
  ["c2", "CCW-2", "Concealed Carry Level 2", 10, 80, 12],
  ["c3", "LOOSE", "Standalone Refresher", 10, 80, 6],
];
for (const [id, code, name, rounds, pass, months] of courses) {
  db.prepare(
    `insert into courses_of_fire (id, code, name, total_rounds, target_type_id, passing_score_percent, expires_months)
     values (?, ?, ?, ?, 't1', ?, ?)`
  ).run(id, code, name, rounds, pass, months);
  db.prepare(
    `insert into cof_phases (id, cof_id, phase_number, title, phase_total_rounds) values (?, ?, 1, 'Phase 1', ?)`
  ).run(`p-${id}`, id, rounds);
  db.prepare(
    `insert into cof_strings (id, phase_id, sort_order, string_number, distance, rounds)
     values (?, ?, 0, 1, '7 yd', ?)`
  ).run(`s-${id}`, `p-${id}`, String(rounds));
}

const students = [
  ["s1", "Alvarez", "Marisol", "m.alvarez@example.test", "555-0101"],
  ["s2", "Reynolds", "Jon", "j.reynolds@example.test", "555-0102"],
  ["s3", "Okafor", "Tomi", null, null],
  ["s4", "Brennan", "Sam", null, null],
];
for (const [id, last, first, email, phone] of students) {
  db.prepare(
    `insert into students (id, last_name, first_name, email, phone, status) values (?, ?, ?, ?, ?, 'active')`
  ).run(id, last, first, email, phone);
}

db.prepare(
  `insert into classes (id, number, title, date, location, status) values ('cl1', 1, 'Seeded Class', '2026-05-01', 'BLACKWATER RANGE', 'in_progress')`
).run();
db.prepare(`insert into class_days (id, class_id, day_number, date) values (?, 'cl1', 1, '2026-05-01')`).run(randomUUID());
for (const [id] of students) {
  db.prepare(`insert into class_enrollment (id, class_id, student_id) values (?, 'cl1', ?)`).run(randomUUID(), id);
}

// Look like an upgrade from the previous release rather than a fresh
// install, so the What's New notice is exercised.
db.prepare(
  `insert into app_settings (key, value) values ('whats_new_seen', '"0.4.0"')
     on conflict(key) do update set value = excluded.value`
).run();

console.log("seeded");
db.close();
