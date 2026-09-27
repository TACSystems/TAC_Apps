import { chromium } from "playwright";

const base = process.env.TQ_BASE || "http://127.0.0.1:3100";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) fails.push(what); };

await page.goto(`${base}/controls`, { waitUntil: "networkidle" });
await page.locator("#controls-home-layout > summary").click();
await page.waitForSelector("#controls-home-layout[open]");

const boxes = page.locator("label:has-text('Class Calendar') input[type=checkbox]");
check(await boxes.count() === 1, "one Class Calendar checkbox");
await boxes.first().uncheck();

const weeks = page.locator("label:has-text('Calendar weeks shown') select");
await weeks.selectOption("4");

await page.getByRole("button", { name: /Save Dashboard Layout/ }).click();
await page.waitForSelector("text=Saved.", { timeout: 10000 });
check(true, "save reports Saved.");

await page.goto(base, { waitUntil: "networkidle" });
const html = await page.content();
check(!html.includes('data-section="calendar"'), "calendar hidden after unchecking");

await page.goto(`${base}/controls`, { waitUntil: "networkidle" });
await page.locator("#controls-home-layout > summary").click();
await page.waitForSelector("#controls-home-layout[open]");
check(await page.locator("label:has-text('Class Calendar') input[type=checkbox]").first().isChecked() === false,
  "checkbox reflects saved state on reload");
check(await page.locator("label:has-text('Calendar weeks shown') select").inputValue() === "4",
  "calendar weeks persisted");

await page.locator("label:has-text('Class Calendar') input[type=checkbox]").first().check();
await page.getByRole("button", { name: /Save Dashboard Layout/ }).click();
await page.waitForSelector("text=Saved.");
await page.goto(base, { waitUntil: "networkidle" });
check((await page.content()).includes('data-section="calendar"'), "calendar back after re-checking");

await browser.close();
console.log(fails.length ? `\n${fails.length} failed` : "\nall passed");
process.exit(fails.length ? 1 : 0);
