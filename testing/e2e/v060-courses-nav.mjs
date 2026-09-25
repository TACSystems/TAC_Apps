const W = process.env.TL_WORK || "/tmp/tl-test";
import { chromium } from "playwright";
import fs from "fs";
const base = "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

await p.addInitScript(() => { setInterval(() => { const d = document.querySelector("[role=alertdialog]"); if (d) { const bs = d.querySelectorAll("button"); bs[bs.length - 1].click(); } }, 150); });
await p.addInitScript(() => { const f = () => document.querySelectorAll("details[data-section]").forEach(d => { if (!d.dataset.auto) { d.dataset.auto = "1"; d.open = true; } }); document.addEventListener("DOMContentLoaded", f); setInterval(f, 200); });
p.on("dialog", d => d.accept());
p.on("pageerror", e => console.log("PAGEERROR", e.message));
const ok = (c, m) => console.log(c ? "PASS" : "FAIL", m);
const body = async () => (await p.locator("body").innerText()).toLowerCase();

await p.goto(base + "/");
ok((await p.locator('header a[aria-current=page]').innerText()).toLowerCase() === "home", "Home tab first and active");
ok((await p.locator("header nav, header").locator("a").nth(1).innerText()).toLowerCase() === "home", "Home is first nav link");
ok((await body()).includes("need one") || (await body()).includes("needs one"), "categorize banner on dashboard");
ok((await body()).includes("take the tour"), "tour offer for existing users");
ok(!(await p.locator("[role=dialog]").count()), "no setup wizard for existing users");

await p.getByRole("link", { name: "Categorize Now" }).click(); await p.waitForURL(/categorize/);
const rowsN = await p.locator(".border-b.border-neutral-800").count();
const pre = await p.locator("input[type=checkbox]:checked").count();
ok(rowsN >= 5 && pre >= 5, `categorize page lists ${rowsN} courses, ${pre} pre-ticked`);
const boxes = p.locator("div.border-b").filter({ has: p.locator("input[type=checkbox]") });
for (let k = 0; k < await boxes.count(); k++) {
  const r = boxes.nth(k);
  if (!(await r.locator("input:checked").count())) await r.locator("label", { hasText: "Handgun" }).click();
}
await p.getByRole("button", { name: /^Save/ }).click(); await p.waitForURL(base + "/courses");
ok(!(await body()).includes("need one"), "banner gone after categorizing");
ok((await p.locator("main").innerText()).includes("HANDGUN"), "category tags on course cards");
const caq = (await p.locator("main").innerText()).includes("RIFLE");
ok(caq, "combined course tagged Rifle too");
await p.getByRole("button", { name: /^Rifle/ }).click();
const rifleCards = await p.locator("main .grid > div").count();
ok(rifleCards >= 1 && rifleCards < 8, `Rifle filter shows ${rifleCards}`);

await p.goto(base + "/courses/new");
await p.locator("input[placeholder^='e.g. Duty']").fill("Test Shotgun Drill");
await p.locator("input[placeholder='e.g. DPQ-50']").fill("TSD-1");
await p.getByRole("button", { name: /Save/ }).last().click(); await p.waitForTimeout(800);
ok((await body()).includes("pick at least one category"), "builder requires a category");
await p.locator("label", { hasText: /^Shotgun$/ }).first().click();
await p.getByRole("button", { name: /Save/ }).last().click(); await p.waitForTimeout(2000);
ok(/\/courses\/[a-f0-9-]+$/.test(p.url()) && (await body()).includes("shotgun"), "course saved with category");

const exp = await (await p.request.get(base + "/api/courses/export")).json();
const one = exp.courses.find(c => c.code === "TSD-1");
ok(one && one.categories?.[0] === "Shotgun", "export includes categories");
const fresh = { ...one, code: "NEW-2", name: "Imported Carbine Drill", categories: undefined, notes: "carbine sling drill" };
fs.writeFileSync(W + "/c1.json", JSON.stringify({ courses: [one] }));
fs.writeFileSync(W + "/c2.json", JSON.stringify({ courses: [fresh] }));
await p.goto(base + "/settings#settings-import-export"); await p.waitForTimeout(500);
await p.locator("input[type=file][accept*=json]").setInputFiles([W + "/c1.json", W + "/c2.json"]); await p.waitForTimeout(1500);
const rev = await body();
ok(rev.includes("review 2 courses") && rev.includes("updates existing") && rev.includes("new"), "review lists 2 courses and flags update");
ok(rev.includes("categories suggested"), "suggestion from course text (rifle)");
await p.getByRole("button", { name: /Import 2 Courses/ }).click(); await p.waitForTimeout(2000);
ok((await body()).includes("imported 2 courses"), "multi-file import");

await p.goto(base + "/courses");
const cardLog = p.locator("main .grid > div", { hasText: "Endurance 50" }).getByRole("link", { name: "Score This Course" });
const { createRequire } = await import("module");
const req = createRequire(import.meta.url);
const D = req("../../node_modules/better-sqlite3-multiple-ciphers");
const dbx = new D(process.argv[2] + "/firearms.db"); dbx.prepare("update firearms set platform = 'Pistol (Semi-Auto)'").run();
dbx.prepare("insert or ignore into firearms (id, make_model, platform, status, date_of_entry) values ('rifle-1','Test AR','Rifle (Semi-Auto)','active', date('now'))").run(); dbx.close();
await cardLog.first().click(); await p.waitForTimeout(800);
const groups = await p.locator("select[name=firearm_id] optgroup").evaluateAll(gs => gs.map(g => g.label + ":" + g.children.length));
ok(groups.length === 2 && groups[0].startsWith("Matches this course (Handgun)"), "handgun course lists pistols first: " + groups.join(" | "));
await p.locator("input[name=date]").fill("2026-09-01");
ok((await p.locator("input[name='field:grader_date']").inputValue()) === "2026-09-01", "grader date follows session date");

await p.goto(base + "/stats");
ok((await body()).includes("by category"), "stats by category");

const p2 = await p.context().browser().newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto(base + "/settings");
ok((await p2.locator("details[data-section][open]").count()) === 0, "settings sections start collapsed");
await p.goto(base + "/settings");
await p.locator("input[placeholder^='Search settings']").fill("date format");
ok(await p.locator("#settings-display").evaluate(d => d.open) && (await p.locator("details[data-section]:visible").count()) <= 2, "settings search opens Display");
await p.locator("input[placeholder^='Search settings']").fill("");
await p.getByRole("button", { name: "Expand All" }).click();
ok((await p.locator("details[data-section][open]").count()) >= 7, "expand all");
await p.goto(base + "/controls#controls-ammo"); await p.waitForTimeout(500);
await p.locator("input[name=defaultAmmoManufacturer]").fill("Federal");
await p.locator("#controls-ammo").getByRole("button", { name: "Save" }).click(); await p.waitForTimeout(1500);
await p.goto(base + "/ammo");
ok((await p.locator("input[name=manufacturer]").inputValue()) === "Federal", "ammo default manufacturer prefilled");

await p2.goto(base + "/");
console.log("P2", p2.url(), await p2.locator("details[data-section]").evaluateAll(ds => ds.map(d => d.id)), await p2.locator("#maintenance > summary").count(), await p2.locator("#maintenance").evaluate(d => d.outerHTML.slice(0, 300) + " open=" + d.open + " vis=" + d.checkVisibility()));
await p2.locator("#maintenance > summary").click(); await p2.waitForTimeout(800);
await p2.reload();
ok(!(await p2.locator("#maintenance").evaluate(d => d.open)), "dashboard collapse remembered");
await p2.locator("#maintenance > summary").click(); await p2.waitForTimeout(800);

await p.goto(base + "/inventory");
await p.locator("tbody tr td:nth-child(6)").first().click(); await p.waitForTimeout(1200);
ok(/\/inventory\/[a-f0-9-]+$/.test(p.url()), "armory row click opens profile");
await p.getByRole("link", { name: "Add Another Like This" }).click(); await p.waitForTimeout(1000);
ok((await p.locator("input[name=make_model]").inputValue()).length > 0 && (await p.locator("input[name=serial_number]").inputValue()) === "", "duplicate copies model, not serial");

await p.goto(base + "/range-log");
await p.locator("tbody tr td:nth-child(2)").first().click(); await p.waitForTimeout(1000);
ok(/\/range-log\/(session\/)?[a-f0-9-]+$/.test(p.url()), "range log row click");

await p.goto(base + "/controls");
const cat = p.locator("#dd-course_category");
ok(await cat.count() === 1, "course categories list in Controls");

await p.goto(base + "/");
await p.getByRole("link", { name: "Take the Tour" }).click(); await p.waitForTimeout(800);
ok(await p.locator("[aria-label='TAC-LOG tour']").isVisible(), "tour opens");
await p.getByRole("button", { name: "Next" }).click(); await p.waitForTimeout(300);
ok((await p.locator("[aria-label='TAC-LOG tour']").innerText()).includes("STEP 2"), "tour advances");
await p.getByRole("button", { name: "Skip tour" }).click(); await p.waitForTimeout(1500);
ok(!(await body()).includes("take the tour"), "tour offer gone after skip");
await b.close();
