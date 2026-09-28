import { chromium } from "playwright";
import Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

const dbPath = `${process.argv[2] || "/tmp/tq-test/db"}/tacqual.db`;
const base = process.env.TQ_BASE || "http://127.0.0.1:3200";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) fails.push(what); };
const text = () => page.locator("body").innerText();

await page.goto(`${base}/records/currency`, { waitUntil: "networkidle" });
check(/Nothing expires yet/i.test(await text()), "empty state before anyone holds a credential");

// c1 never expires, c2 expires after 12 months, c3 after 6 and belongs to
// no certification. s1 holds the certification, s2 is partway through.
{
  const db = new Database(dbPath);
  const certId = randomUUID();
  db.prepare(`insert into certifications (id, name, code, sort_order) values (?, 'Basic Pistol', 'BP', 0)`).run(certId);
  ["c1", "c2"].forEach((c, i) =>
    db.prepare(`insert into certification_courses (id, certification_id, cof_id, sort_order) values (?, ?, ?, ?)`)
      .run(randomUUID(), certId, c, i)
  );
  const run = (id, student, cof, date) =>
    db.prepare(
      `insert into score_runs (id, class_id, student_id, cof_id, date, attempt, final_score_percent, passed)
       values (?, 'cl1', ?, ?, ?, 1, 92, 1)`
    ).run(id, student, cof, date);
  run("r1", "s1", "c1", "2026-01-01");
  run("r2", "s1", "c2", "2026-03-01");
  run("r3", "s1", "c3", "2026-06-01");
  run("r4", "s2", "c1", "2026-01-01");
  db.close();
}

await page.goto(`${base}/records/currency?f=everyone`, { waitUntil: "networkidle" });
const body = await text();
check(/Alvarez/.test(body), "the student who holds the certification is listed");
check(!/Reynolds/.test(body), "a student partway through is not listed");

const rows = await page.locator("tbody tr").count();
check(rows === 2, "two rows: the certification and the standalone course, not one per course");
check(/Basic Pistol/.test(body), "the certification is a row");
check(/Standalone Refresher/.test(body), "a course in no certification is its own row");
check(!/Civilian Defensive Handgun/.test(body), "a course inside a certification is not its own row");

check(/Needs attention/i.test(body) && /Everyone/i.test(body), "the counts are the filters");
await page.getByRole("link", { name: /^Current/i }).click();
await page.waitForURL(/f=current/);
check(/Basic Pistol/.test(await text()), "the certification is current in 2027 terms");

await page.goto(`${base}/records/currency?f=everyone`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /Print List/i }).click();
await page.waitForURL(/\/records\/currency\/print\?f=everyone/, { timeout: 15000 });
const printed = await text();
check(/Basic Pistol/.test(printed) && /Standalone Refresher/.test(printed), "the printable list carries the filter");
check(/m\.alvarez@example\.test/.test(printed), "contact details print, so people can be called in");

const csv = await page.request.get(`${base}/api/csv?type=currency&f=everyone`);
const csvText = await csv.text();
check(csv.ok(), "the CSV export answers");
check(/CREDENTIAL/.test(csvText) && /Basic Pistol/.test(csvText), "the CSV carries the credential rows");

{
  const db = new Database(dbPath);
  db.prepare(`update students set status = 'inactive' where id = 's1'`).run();
  db.close();
}
await page.goto(`${base}/records/currency?f=everyone`, { waitUntil: "networkidle" });
check(/Nothing expires yet/i.test(await text()), "an inactive student drops out entirely");

console.log(fails.length === 0 ? "ALL PASS" : `FAILURES: ${fails.length}`);
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
