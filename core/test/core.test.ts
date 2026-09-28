import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3-multiple-ciphers";
import { dateOr, isValidISODate, isoDate, number, text } from "@core/lib/forms";
import { formatDate, formatDay, money } from "@core/lib/format";
import { parseParSeconds } from "@core/lib/par";
import {
  isCombinedArms,
  matchWeaponOption,
  joinRoundsParts,
  roundsPartsFor,
  splitWeaponCell,
  weaponOptions,
  weaponTypeOf,
} from "@core/lib/course-categories";
import { passFail } from "@core/lib/cof-shared";
import { addColumnIfMissing, runMigrations } from "@core/lib/migrations";
import { createZip, readZip } from "@core/lib/zip";
import { seal, unseal } from "@core/lib/security-state";
import { parseProseChangelog } from "@core/lib/changelog-prose";
import { randomBytes } from "node:crypto";
import {
  START_TONE,
  END_TONE,
  courseElapsed,
  elapsedAt,
  isComplete,
  limitFor,
  overBy,
  phaseAt,
  remainingAt,
  schedule,
  standbyDelay,
  totalRounds,
} from "../src/lib/run-clock.ts";

test("form checks", () => {
  const fd = new FormData();
  fd.set("a", "  hello ");
  fd.set("n", "1,200.5");
  fd.set("d", "2026-02-30");
  fd.set("ok", "2026-09-25");
  assert.equal(text(fd, "a"), "hello");
  assert.equal(text(fd, "missing"), null);
  assert.equal(number(fd, "n"), 1200.5);
  assert.equal(number(fd, "n", { int: true }), 1201);
  assert.equal(number(fd, "n", { max: 100 }), 100);
  assert.equal(isoDate(fd, "d"), null);
  assert.equal(isoDate(fd, "ok"), "2026-09-25");
  assert.equal(dateOr(fd, "d", "2026-01-01"), "2026-01-01");
  assert.equal(isValidISODate("2024-02-29"), true);
  assert.equal(isValidISODate("2023-02-29"), false);
});

test("date and money formatting", () => {
  assert.equal(formatDate("2026-09-05", "us"), "09/05/2026");
  assert.equal(formatDate("2026-09-05", "eu"), "05/09/2026");
  assert.equal(formatDay("2026-09-05 14:30:00", "iso"), "2026-09-05");
  assert.equal(money(1234.5, "$"), "$1,234.5");
});

test("par times and pass/fail", () => {
  assert.equal(parseParSeconds("6 sec"), 6);
  assert.equal(parseParSeconds("1:30"), 90);
  assert.equal(parseParSeconds("SLOW FIRE"), null);
  assert.equal(passFail(80, 80), "PASS");
  assert.equal(passFail(79.9, 80), "FAIL");
  assert.equal(passFail(null, 80), null);
});

test("numbered migrations run once, in order", () => {
  const db = new Database(":memory:");
  db.exec("create table t (id integer primary key)");
  const order: number[] = [];
  const list = [
    { id: 2, name: "b", up: (d: Database.Database) => { order.push(2); addColumnIfMissing(d, "t", "b", "TEXT"); } },
    { id: 1, name: "a", up: (d: Database.Database) => { order.push(1); addColumnIfMissing(d, "t", "a", "TEXT"); } },
  ];
  assert.deepEqual(runMigrations(db, list), [1, 2]);
  assert.deepEqual(order, [1, 2]);
  assert.deepEqual(runMigrations(db, list), []);
  const bad = [{ id: 3, name: "boom", up: () => { throw new Error("x"); } }];
  assert.throws(() => runMigrations(db, bad));
  assert.equal((db.prepare("select count(*) n from schema_migrations where id = 3").get() as { n: number }).n, 0);
});

test("zip round trip and sealing", () => {
  const zip = createZip([{ name: "a.txt", data: Buffer.from("alpha") }, { name: "b/c.bin", data: randomBytes(5000) }]);
  const back = readZip(zip);
  assert.equal(back.find((e) => e.name === "a.txt")?.data.toString(), "alpha");
  assert.equal(back.find((e) => e.name === "b/c.bin")?.data.length, 5000);
  const key = randomBytes(32);
  const sealed = seal(key, Buffer.from("secret"));
  assert.equal(unseal(key, sealed).toString(), "secret");
  assert.throws(() => unseal(randomBytes(32), sealed));
});

test("prose changelog parsing", () => {
  const md = [
    "# App Changelog",
    "",
    "## 0.4.0",
    "Opening line that",
    "wraps across two lines.",
    "",
    "**A lead.** Body of the note.",
    "",
    "**Another lead:** second body.",
    "",
    "## [0.3.0] — 2026-09-01",
    "Dated heading, same shape.",
    "",
    "## [0.5.0] — planned",
    "Not shipped.",
  ].join("\n");
  const v = parseProseChangelog(md);
  assert.deepEqual(v.map((x) => x.version), ["0.4.0", "0.3.0"]);
  assert.equal(v[0].intro, "Opening line that wraps across two lines.");
  assert.deepEqual(v[0].notes, [
    { lead: "A lead", body: "Body of the note." },
    { lead: "Another lead", body: "second body." },
  ]);
  assert.equal(v[1].date, "2026-09-01");
  assert.equal(v[1].intro, "Dated heading, same shape.");
});

test("run clock: both tones are booked up front, so the end cannot drift", () => {
  const tones: { at: number; freq: number }[] = [];
  let t = 100;
  const clock = { now: () => t, tone: (at: number, freq: number) => tones.push({ at, freq }) };

  const s = schedule(clock, 2, 6);
  assert.equal(s.startAt, 102);
  assert.equal(s.endAt, 108);
  assert.deepEqual(tones, [
    { at: 102, freq: START_TONE },
    { at: 108, freq: END_TONE },
  ]);
  assert.notEqual(START_TONE, END_TONE, "start and end must be distinguishable by ear");
});

test("run clock: a string with no par gets a start tone and no end", () => {
  const tones: number[] = [];
  const clock = { now: () => 0, tone: (_at: number, freq: number) => tones.push(freq) };
  const s = schedule(clock, 1, null);
  assert.equal(s.endAt, null);
  assert.deepEqual(tones, [START_TONE]);
  assert.equal(remainingAt(50, s), null);
  assert.equal(overBy(50, s), null, "you cannot be over a limit that does not exist");
});

test("run clock: phases follow the booked times", () => {
  const clock = { now: () => 0, tone: () => {} };
  const s = schedule(clock, 2, 6);
  assert.equal(phaseAt(1, s, false), "standby");
  assert.equal(phaseAt(2, s, false), "live");
  assert.equal(phaseAt(7.9, s, false), "live");
  assert.equal(phaseAt(8, s, false), "over");
  assert.equal(phaseAt(3, s, true), "paused", "pause wins over everything");
  assert.equal(elapsedAt(1, s), 0, "the clock does not run before the beep");
  assert.equal(elapsedAt(5, s), 3);
  assert.equal(overBy(9.5, s)?.toFixed(1), "1.5");
});

test("run clock: limits by mode", () => {
  const str = { id: "a", label: "", phase: "", par: 6, rounds: 5, details: [] };
  const slow = { ...str, par: null };
  assert.equal(limitFor("par", str, 30), 6, "par mode uses the course's own limit");
  assert.equal(limitFor("par", slow, 30), null, "slow fire has no limit");
  assert.equal(limitFor("countdown", str, 30), 30, "countdown uses the instructor's limit");
  assert.equal(limitFor("countdown", str, 0), null);
  assert.equal(limitFor("stopwatch", str, 30), null, "a stopwatch never expires");
});

test("run clock: the course clock spans first beep to last, less time paused", () => {
  assert.equal(courseElapsed(null, null, 500, 0), 0, "nothing until the first beep");
  assert.equal(courseElapsed(100, null, 160, 0), 60, "still running: counts to now");
  assert.equal(courseElapsed(100, 200, 900, 0), 100, "finished: counts to the last beep, not to now");
  assert.equal(courseElapsed(100, 200, 900, 25), 75, "a cease fire is not shooting time");
});

test("run clock: a skipped string contributes no rounds", () => {
  const strings = [
    { id: "a", label: "", phase: "", par: 2, rounds: 6, details: [] },
    { id: "b", label: "", phase: "", par: 4, rounds: 5, details: [] },
    { id: "c", label: "", phase: "", par: null, rounds: 3, details: [] },
  ];
  const outcomes = {
    a: { id: "a", elapsed: 1.8, skipped: false, reruns: 0 },
    b: { id: "b", elapsed: null, skipped: true, reruns: 0 },
  };
  assert.equal(totalRounds(strings, outcomes), 6, "only strings actually fired count");
  assert.equal(isComplete(strings, outcomes), false, "one string has no outcome yet");
  const done = { ...outcomes, c: { id: "c", elapsed: 9, skipped: false, reruns: 2 } };
  assert.equal(isComplete(strings, done), true, "a skipped string still counts as resolved");
  assert.equal(totalRounds(strings, done), 9);
});

test("run clock: the stand-by delay stays inside its range", () => {
  assert.equal(standbyDelay(1, 4, () => 0), 1);
  assert.equal(standbyDelay(1, 4, () => 1), 4);
  assert.equal(standbyDelay(1, 4, () => 0.5), 2.5);
  assert.equal(standbyDelay(3, 1, () => 0.5), 3, "a backwards range collapses rather than going negative");
});

test("run clock: rounds add up across a split string", () => {
  // "2 / 2" is a string fired in two parts — four rounds, not twenty-two.
  const parse = (v: string) => {
    const parts = v.match(/\d+(?:\.\d+)?/g);
    return parts ? parts.reduce((s, p) => s + Number(p), 0) : null;
  };
  assert.equal(parse("8 rounds"), 8);
  assert.equal(parse("2 / 2"), 4);
  assert.equal(parse("4 / 2 rounds"), 6);
  assert.equal(parse("as needed"), null);
});

test("weapon type of a category", () => {
  assert.equal(weaponTypeOf("Handgun"), "handgun");
  assert.equal(weaponTypeOf("Duty Pistol"), "handgun");
  assert.equal(weaponTypeOf("Patrol Rifle"), "rifle");
  assert.equal(weaponTypeOf("PCC"), "rifle");
  assert.equal(weaponTypeOf("12 Gauge"), "shotgun");
  assert.equal(weaponTypeOf("Precision"), "precision");
});

test("combined arms is derived from the categories", () => {
  assert.equal(isCombinedArms([]), false);
  assert.equal(isCombinedArms(["Handgun"]), false);
  assert.equal(isCombinedArms(["Handgun", "Duty Pistol"]), false);
  assert.equal(isCombinedArms(["Handgun", "Rifle"]), true);
  assert.equal(isCombinedArms(["Handgun", "Rifle", "Shotgun"]), true);
});

test("weapon options are the categories and their combinations, in order", () => {
  assert.deepEqual(weaponOptions(["Handgun"]), ["Handgun"]);
  assert.deepEqual(weaponOptions(["Handgun", "Rifle"]), ["Handgun", "Rifle", "Handgun / Rifle"]);
  assert.deepEqual(weaponOptions(["Handgun", "Rifle", "Shotgun"]), [
    "Handgun",
    "Rifle",
    "Shotgun",
    "Handgun / Rifle",
    "Handgun / Shotgun",
    "Rifle / Shotgun",
    "Handgun / Rifle / Shotgun",
  ]);
  const many = weaponOptions(["A", "B", "C", "D", "E"]);
  assert.equal(many.length, 5 + 10 + 1);
  assert.equal(many.at(-1), "A / B / C / D / E");
  assert.deepEqual(weaponOptions([]), []);
  assert.deepEqual(weaponOptions([" ", ""]), []);
});

test("a weapon cell splits in the order the rounds cell is read", () => {
  assert.deepEqual(splitWeaponCell("Handgun / Rifle"), ["Handgun", "Rifle"]);
  assert.deepEqual(splitWeaponCell(" Handgun /  / Rifle "), ["Handgun", "Rifle"]);
  assert.deepEqual(splitWeaponCell(""), []);
  assert.deepEqual(splitWeaponCell(null), []);
});

test("rounds parts follow the weapon count", () => {
  assert.deepEqual(roundsPartsFor("4 / 2", 2), ["4", "2"]);
  assert.deepEqual(roundsPartsFor("4 / 2", 1), ["4"]);
  assert.deepEqual(roundsPartsFor("4", 3), ["4", "", ""]);
  assert.deepEqual(roundsPartsFor(null, 2), ["", ""]);
  assert.deepEqual(roundsPartsFor("6", 0), ["6"]);
  assert.equal(joinRoundsParts(["4", "2"]), "4 / 2");
  assert.equal(joinRoundsParts(["4", ""]), "4");
  assert.equal(joinRoundsParts(["", ""]), "");
  assert.equal(joinRoundsParts(["", "2"]), " / 2");
});

test("a weapon cell matches its option however it is spelled", () => {
  const opts = weaponOptions(["Handgun", "Rifle"]);
  assert.equal(matchWeaponOption("Handgun", opts), "Handgun");
  assert.equal(matchWeaponOption("HANDGUN", opts), "Handgun");
  assert.equal(matchWeaponOption("handgun / rifle", opts), "Handgun / Rifle");
  assert.equal(matchWeaponOption("Handgun/Rifle", opts), "Handgun / Rifle");
  assert.equal(matchWeaponOption("HG/RFL", opts), null);
  assert.equal(matchWeaponOption("Rifle / Handgun", opts), null);
  assert.equal(matchWeaponOption("", opts), null);
  assert.equal(matchWeaponOption(null, opts), null);
});
