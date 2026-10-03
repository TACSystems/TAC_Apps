import { chromium } from "playwright";
const base = "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", m); };
const openAll = () => p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));

await p.goto(base + "/run");
await p.waitForTimeout(700);
ok((await p.locator("h1").first().innerText()).toUpperCase().includes("RUN COURSE"), "Run Course has a page of its own");
ok((await p.locator("a[href^='/run/']").count()) >= 5, "it lists the courses");
await p.goto(base + "/range-log");
ok((await p.getByRole("link", { name: /^Run Course$/ }).count()) > 0, "Range Log offers it");
await p.goto(base + "/");
ok((await p.getByRole("link", { name: /^Run Course$/ }).count()) > 0, "the dashboard offers it");

await p.goto(base + "/help");
await p.waitForTimeout(500);
await openAll();
const help = await p.locator("body").innerText();
ok(/run course/i.test(help), "Help covers Run Course");
ok(/separate from run course/i.test(help), "Help says the Par Timer is a separate tool");

// An interrupted run comes back.
await p.goto(base + "/courses");
await p.getByText("Breach Hammer 50").first().click();
await p.waitForURL(/\/courses\/[a-f0-9-]+$/);
const id = p.url().split("/").pop();
await p.goto(`${base}/run/${id}`);
await p.waitForTimeout(600);
const first = p.locator("a[href*='/run/'], button").filter({ hasText: /Run →|Start Run/ }).first();
if (await first.count()) await first.click();
else await p.locator("a[href*='fa=']").first().click();
await p.waitForURL(/\/run\/.*fa=/, { timeout: 15000 });
await p.waitForTimeout(800);
for (let i = 0; i < 6; i++) { await p.keyboard.press("Space"); await p.waitForTimeout(140); }
const doneBefore = await p.locator(".run-str-done").count();
ok(doneBefore >= 2, `strings were shot before the interruption (${doneBefore})`);

await p.reload();
await p.waitForTimeout(1200);
ok(/unfinished run/i.test(await p.locator("body").innerText()), "an interrupted run is offered back");
await p.getByRole("button", { name: /^Resume$/ }).click();
await p.waitForTimeout(600);
ok((await p.locator(".run-str-done").count()) === doneBefore, "resuming keeps the strings already shot");

await p.reload();
await p.waitForTimeout(1200);
await p.getByRole("button", { name: /Start again/i }).click();
await p.waitForTimeout(500);
ok((await p.locator(".run-str-done").count()) === 0, "starting again clears them");
await p.reload();
await p.waitForTimeout(1200);
ok(!/unfinished run/i.test(await p.locator("body").innerText()), "and the offer does not come back");

console.log(fails === 0 ? "ALL PASS" : `TOTAL FAILURES: ${fails}`);
await b.close();
process.exit(fails === 0 ? 0 : 1);
