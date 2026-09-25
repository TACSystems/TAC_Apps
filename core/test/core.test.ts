import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3-multiple-ciphers";
import { dateOr, isValidISODate, isoDate, number, text } from "@core/lib/forms";
import { formatDate, formatDay, money } from "@core/lib/format";
import { parseParSeconds } from "@core/lib/par";
import { passFail } from "@core/lib/cof-shared";
import { addColumnIfMissing, runMigrations } from "@core/lib/migrations";
import { createZip, readZip } from "@core/lib/zip";
import { seal, unseal } from "@core/lib/security-state";
import { randomBytes } from "node:crypto";

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
