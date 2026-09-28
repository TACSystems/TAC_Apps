import { chromium } from "playwright";
import Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

const dbPath = `${process.argv[2] || "/tmp/tq-test/db"}/tacqual.db`;
const base = process.env.TQ_BASE || "http://127.0.0.1:3200";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) fails.push(what); };
const read = (fn) => { const d = new Database(dbPath, { readonly: true }); try { return fn(d); } finally { d.close(); } };
const open = async (id) => {
  if (!(await page.locator(`#${id}[open]`).count())) await page.locator(`#${id} > summary`).click();
  await page.waitForSelector(`#${id}[open]`);
};

// Two-course certification on the class; s1 finishes both, s2 finishes one,
// s3 has no runs at all, s4 is enrolled and untouched.
{
  const db = new Database(dbPath);
  const certId = randomUUID();
  db.prepare(`insert into certifications (id, name, code, sort_order) values (?, 'Basic Pistol', 'BP', 0)`).run(certId);
  ["c1", "c2"].forEach((c, i) =>
    db.prepare(`insert into certification_courses (id, certification_id, cof_id, sort_order) values (?, ?, ?, ?)`)
      .run(randomUUID(), certId, c, i)
  );
  db.prepare(`update classes set certification_id = ? where id = 'cl1'`).run(certId);
  for (const c of ["c1", "c2"]) {
    db.prepare(`insert into class_courses (id, class_id, cof_id, sort_order) values (?, 'cl1', ?, 0)`)
      .run(randomUUID(), c);
  }
  const run = (id, student, cof, date, passed) =>
    db.prepare(
      `insert into score_runs (id, class_id, student_id, cof_id, date, attempt, final_score_percent, passed)
       values (?, 'cl1', ?, ?, ?, 1, ?, ?)`
    ).run(id, student, cof, date, passed ? 92 : 44, passed ? 1 : 0);
  run("r1", "s1", "c1", "2026-05-01", true);
  run("r2", "s1", "c2", "2026-05-02", true);
  run("r3", "s2", "c1", "2026-05-01", true);
  run("r4", "s2", "c2", "2026-05-02", false);
  db.close();
}

await page.goto(`${base}/classes/cl1`, { waitUntil: "networkidle" });
check(/certificates/i.test(await page.locator("body").innerText()), "the class page has a Certificates section");
await open("certificates");
const body = await page.locator("#certificates").innerText();
check(/Basic Pistol/i.test(body), "it names the certification the class is taught from");
check(/Alvarez/.test(body), "a student who finished is listed");
check(/Reynolds/.test(body), "a student partway through is listed");
check(!/Okafor/.test(body), "a student with no runs is not on the certificate sheet");
check(/complete\s*—\s*not issued/i.test(body), "the finished student reads as complete, not issued");
check(/needs\s+CCW-2/i.test(body), "the partway student says which course is missing");

const issueButton = page.getByRole("button", { name: /Issue 1 Certificate/i });
check((await issueButton.count()) === 1, "the button says how many will be issued");
await issueButton.click();
await page.waitForURL(/\/classes\/cl1\/certificates$/, { timeout: 20000 });

const issued = read((d) => d.prepare(`select number, student_id from certificates order by number`).all());
check(issued.length === 1, "exactly one certificate was issued");
check(issued[0].number === 1, "the first certificate is number 1");
check(issued[0].student_id === "s1", "it went to the student who finished");

const sheet = await page.locator("body").innerText();
check(/Certificate of Completion/i.test(sheet), "the print sheet carries the default title");
check(/Marisol\s+Alvarez/.test(sheet), "the certificate names the student");
check(/Certificate No\.\s*1/.test(sheet), "the number prints on the certificate");

await page.goto(`${base}/classes/cl1`, { waitUntil: "networkidle" });
await open("certificates");
const again = page.getByRole("button", { name: /Nothing to issue/i });
check((await again.count()) === 1, "with nobody ready the button says so and is disabled");
check(await again.isDisabled(), "and it really is disabled");

// Reload the print sheet directly: it must not mint anything.
await page.goto(`${base}/classes/cl1/certificates`, { waitUntil: "networkidle" });
const afterReload = read((d) => d.prepare(`select count(*) as n from certificates`).get().n);
check(afterReload === 1, "loading the print URL cannot mint a certificate");
check(/Certificate No\.\s*1/.test(await page.locator("body").innerText()), "a reprint carries the same number");

// Finish the second student, then issue again: the first number is untouched.
{
  const db = new Database(dbPath);
  db.prepare(
    `insert into score_runs (id, class_id, student_id, cof_id, date, attempt, final_score_percent, passed)
     values ('r5', 'cl1', 's2', 'c2', '2026-05-09', 2, 91, 1)`
  ).run();
  db.close();
}
await page.goto(`${base}/classes/cl1`, { waitUntil: "networkidle" });
await open("certificates");
await page.getByRole("button", { name: /Issue 1 Certificate/i }).click();
await page.waitForURL(/\/classes\/cl1\/certificates$/, { timeout: 20000 });
const both = read((d) => d.prepare(`select number, student_id from certificates order by number`).all());
check(both.length === 2 && both[0].number === 1 && both[1].number === 2, "numbers continue from where they left off");
check(both[0].student_id === "s1", "the first student's certificate is unchanged");

console.log(fails.length === 0 ? "ALL PASS" : `FAILURES: ${fails.length}`);
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
