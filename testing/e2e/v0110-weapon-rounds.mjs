import { chromium } from "playwright";
const base = "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
const p = await ctx.newPage();
p.on("dialog", d => d.accept());
p.on("pageerror", e => console.log("PAGEERROR", e.message));
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", m); };
const eq = (got, want, m) => ok(JSON.stringify(got) === JSON.stringify(want), `${m} ${JSON.stringify(got)}`);

await p.goto(base + "/courses");
await p.getByText("Combined Arms Qualification V 2.0").first().click();
await p.waitForURL(/\/courses\/[a-f0-9-]+$/);
const id = p.url().split("/").pop();
await p.goto(`${base}/courses/${id}/edit`);
await p.waitForTimeout(800);

for (const c of ["Handgun", "Rifle"]) {
  const chip = p.locator("label, button").filter({ hasText: new RegExp(`^${c}$`, "i") }).first();
  if (await chip.count()) await chip.click();
}
await p.waitForTimeout(400);
ok((await p.locator("body").innerText()).includes("Combined Arms Course"), "combined arms flag shown for a two-type course");

const rows = p.locator("table").first().locator("tbody tr");
const cells = async (i) => rows.nth(i).evaluate((tr) => Array.from(tr.querySelectorAll("td")).map((td) => Array.from(td.querySelectorAll("input,select")).map((e) => e.value)));
const wsel = (i) => rows.nth(i).locator("select").last();
const opts = (i) => wsel(i).locator("option").allTextContents();

eq(await opts(0), ["—", "Handgun", "Rifle", "Handgun / Rifle"], "options are the categories and their combinations");
eq((await cells(0)).slice(3, 5), [["Handgun"], ["2"]], "a cell spelled HANDGUN selects the Handgun option");
eq((await cells(2)).slice(3, 5), [["HG/RFL"], ["2", "2"]], "an off-list two-part cell keeps its value and splits the rounds");
ok((await opts(2)).some((o) => o.includes("off-list")), "the off-list value stays on offer");

await wsel(2).selectOption("Handgun / Rifle");
await p.waitForTimeout(300);
eq((await cells(2)).slice(3, 5), [["Handgun / Rifle"], ["2", "2"]], "picking the canonical weapon keeps both round counts");
ok(!(await opts(2)).some((o) => o.includes("off-list")), "off-list option drops once unused");

await wsel(2).selectOption("Rifle");
await p.waitForTimeout(300);
eq((await cells(2)).slice(3, 5), [["Rifle"], ["2"]], "one weapon collapses the rounds to one box");
await wsel(2).selectOption("Handgun / Rifle");
await p.waitForTimeout(300);
eq((await cells(2)).slice(3, 5), [["Handgun / Rifle"], ["2", ""]], "two weapons split again, second box empty");
await rows.nth(2).locator("td").nth(4).locator("input").nth(1).fill("2");
await p.waitForTimeout(300);

const autos = await p.locator("input[placeholder^='Auto:']").evaluateAll((els) => els.map((e) => e.placeholder));
await wsel(4).selectOption("Handgun");
await p.waitForTimeout(300);
const autos2 = await p.locator("input[placeholder^='Auto:']").evaluateAll((els) => els.map((e) => e.placeholder));
ok(autos[1] !== autos2[1], `phase total follows the dropped part (${autos[1]} -> ${autos2[1]})`);
await wsel(4).selectOption("Handgun / Rifle");
await rows.nth(4).locator("td").nth(4).locator("input").nth(1).fill("2");
await p.waitForTimeout(300);
const autos3 = await p.locator("input[placeholder^='Auto:']").evaluateAll((els) => els.map((e) => e.placeholder));
ok(autos[1] === autos3[1], "phase total returns when the part is typed back");

await p.getByRole("button", { name: /^Save/ }).first().click();
await p.waitForURL(/\/courses\/[a-f0-9-]+$/, { timeout: 15000 });
await p.goto(`${base}/courses/${id}/edit`);
await p.waitForTimeout(800);
eq((await cells(2)).slice(3, 5), [["Handgun / Rifle"], ["2", "2"]], "the canonical weapon survives a save and reload");

console.log(fails === 0 ? "ALL PASS" : `TOTAL FAILURES: ${fails}`);
await b.close();
process.exit(fails === 0 ? 0 : 1);
