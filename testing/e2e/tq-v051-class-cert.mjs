import { chromium } from "playwright";
import Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

const dbPath = `${process.argv[2] || "/tmp/tq-test/db"}/tacqual.db`;
const base = process.env.TQ_BASE || "http://127.0.0.1:3200";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) fails.push(what); };

const db = new Database(dbPath);
const cert = (name, cofIds) => {
  const id = randomUUID();
  db.prepare(`insert into certifications (id, name, sort_order) values (?, ?, 0)`).run(id, name);
  cofIds.forEach((c, i) =>
    db.prepare(`insert into certification_courses (id, certification_id, cof_id, sort_order) values (?, ?, ?, ?)`)
      .run(randomUUID(), id, c, i)
  );
  return id;
};
const twoCourse = cert("Two Course Cert", ["c1", "c2"]);
cert("Other Cert", ["c3"]);
const classCourses = () => {
  const d = new Database(dbPath, { readonly: true });
  const rows = d.prepare(`select cof_id from class_courses where class_id = 'cl1' order by sort_order`).all();
  d.close();
  return rows.map((r) => r.cof_id);
};

// A course already on the class, added by hand, that must survive everything.
db.prepare(`insert into class_courses (id, class_id, cof_id, sort_order) values (?, 'cl1', 'c3', 0)`).run(randomUUID());
db.close();

await page.goto(`${base}/classes/cl1/edit`, { waitUntil: "networkidle" });
const select = page.locator('select[name="certification_id"]');
check((await select.count()) === 1, "the class form offers a certification");
check(/No certification/.test(await select.innerText()), "no certification is the default option");

await select.selectOption({ label: "Two Course Cert" });
await page.getByRole("button", { name: /Save/i }).first().click();
await page.waitForURL(/\/classes\/cl1$/, { timeout: 15000 });

const after = classCourses();
check(after.includes("c1") && after.includes("c2"), "its courses are attached");
check(after[0] === "c3", "the hand-added course keeps its place at the front");
check(after.length === 3, "nothing else was added");

await page.goto(`${base}/classes/cl1/edit`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Save/i }).first().click();
await page.waitForURL(/\/classes\/cl1$/, { timeout: 15000 });
check(classCourses().length === 3, "re-saving attaches nothing twice");

await page.goto(`${base}/classes/cl1/edit`, { waitUntil: "networkidle" });
await page.locator('select[name="certification_id"]').selectOption({ label: "Other Cert" });
await page.getByRole("button", { name: /Save/i }).first().click();
await page.waitForURL(/\/classes\/cl1$/, { timeout: 15000 });
const swapped = classCourses();
check(
  swapped.includes("c1") && swapped.includes("c2") && swapped.includes("c3"),
  "changing certification removes nothing — a course may carry scored runs"
);

console.log(fails.length === 0 ? "ALL PASS" : `FAILURES: ${fails.length}`);
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
