import { chromium } from "playwright";

const base = process.env.TQ_BASE || "http://127.0.0.1:3200";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) fails.push(what); };
const seen = async (re, ms = 8000) =>
  page.getByText(re).first().waitFor({ state: "visible", timeout: ms }).then(() => true).catch(() => false);
const open = async (id) => { await page.locator(`#${id} > summary`).click(); await page.waitForSelector(`#${id}[open]`); };

await page.goto(`${base}/certifications`, { waitUntil: "networkidle" });
check(/certifications/i.test(await page.content()), "certifications page loads");
check((await page.getByText(/No certifications yet/i).count()) === 1, "empty state on a fresh database");

await page.getByRole("link", { name: /\+ Certification/i }).click();
await page.waitForURL(/\/certifications\/new/);
await page.waitForSelector("input[placeholder='Concealed Carry Certification']");
await page.waitForTimeout(500);

await page.getByRole("button", { name: /Save Certification/i }).click();
check(await seen(/needs a name/i), "a nameless certification is refused");

await page.getByPlaceholder("Concealed Carry Certification").fill("Basic Pistol");
await page.getByRole("button", { name: /Save Certification/i }).click();
check(
  await seen(/at least one course/i),
  "a certification with no courses is refused"
);

await page.getByRole("button", { name: /\+ CDH-1/ }).click();
await page.getByRole("button", { name: /\+ CCW-2/ }).click();
check((await page.locator("ol li").count()) === 2, "both courses are in the ordered list");

const firstRow = page.locator("ol li").first();
check(/CDH-1/.test(await firstRow.innerText()), "CDH-1 is first before reordering");
await firstRow.getByRole("button", { name: "↓" }).click();
check(/CCW-2/.test(await page.locator("ol li").first().innerText()), "the down arrow reorders");
await page.locator("ol li").first().getByRole("button", { name: "↓" }).click();

await page.getByRole("button", { name: /Save Certification/i }).click();
await page.waitForURL(/\/certifications\/[0-9a-f-]{36}$/, { timeout: 15000 });
const detail = await page.content();
check(/Basic Pistol/i.test(detail), "the detail page names the certification");
check(/CDH-1/.test(detail) && /CCW-2/.test(detail), "both courses print on the detail page");
check(/never expires/i.test(detail) && /expires after 12 months/i.test(detail), "each course shows its own expiry");
check(/Nobody has passed/i.test(detail), "no students yet");

const url = page.url();
await page.goto(`${base}/certifications`, { waitUntil: "networkidle" });
check((await page.getByText("Basic Pistol", { exact: false }).count()) > 0, "it appears in the list");
check(/1 course|2 courses/.test(await page.content()), "the card carries a course count");

await page.goto(`${url}/edit`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.getByPlaceholder("Concealed Carry Certification").fill("Basic Pistol Certification");
await page.getByRole("button", { name: /Save Certification/i }).click();
await page.waitForURL(/\/certifications\/[0-9a-f-]{36}$/, { timeout: 15000 });
check(/Basic Pistol Certification/i.test(await page.content()), "a rename sticks");

await page.goto(`${base}/certifications/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.getByPlaceholder("Concealed Carry Certification").fill("Basic Pistol Certification");
await page.getByRole("button", { name: /\+ CDH-1/ }).click();
await page.getByRole("button", { name: /Save Certification/i }).click();
check(
  await seen(/already uses that name/i),
  "a duplicate name is refused by name, not by a crash"
);

console.log(fails.length === 0 ? "ALL PASS" : `FAILURES: ${fails.length}`);
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
