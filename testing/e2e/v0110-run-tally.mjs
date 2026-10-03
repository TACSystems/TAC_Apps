import { chromium } from "playwright";
const base = "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", m); };
const eq = (got, want, m) => ok(JSON.stringify(got) === JSON.stringify(want), `${m} ${JSON.stringify(got)}`);

await p.goto(base + "/courses");
await p.getByText("Combined Arms Qualification V 2.0").first().click();
await p.waitForURL(/\/courses\/[a-f0-9-]+$/);
const id = p.url().split("/").pop();

// Give the course its two categories through the builder, the way Brad would.
await p.goto(`${base}/courses/${id}/edit`);
await p.waitForTimeout(700);
for (const c of ["Handgun", "Rifle"]) {
  const chip = p.locator("label, button").filter({ hasText: new RegExp(`^${c}$`, "i") }).first();
  if (await chip.count()) await chip.click();
}
await p.getByRole("button", { name: /^Save/ }).first().click();
await p.waitForURL(/\/courses\/[a-f0-9-]+$/, { timeout: 15000 });

await p.goto(`${base}/run/${id}`);
await p.waitForTimeout(700);
eq(await p.locator("h3").allTextContents(), ["Handgun", "Rifle"], "a combined arms course asks once per weapon");
ok(await p.getByText("Start Run").first().evaluate((e) => e.tagName === "BUTTON" && e.disabled), "start is held until every weapon has a firearm");
await p.getByRole("button", { name: /Sample Compact 9/ }).first().click();
ok(await p.getByText("Start Run").first().evaluate((e) => e.tagName === "BUTTON" && e.disabled), "one of two is not enough");
await p.getByRole("button", { name: /Sample Arms SR-15/ }).first().click();
await p.getByRole("link", { name: /Start Run/ }).click();
await p.waitForURL(/\/run\//);
await p.waitForTimeout(900);
ok((await p.locator(".run-pill").first().innerText()).includes("Handgun: Sample Compact 9"), "both firearms named on the run");

const strings = await p.locator(".run-str").count();
await p.keyboard.press("s");
await p.waitForTimeout(150);
for (let i = 0; i < strings * 2 + 4; i++) { await p.keyboard.press("Space"); await p.waitForTimeout(90); }
await p.waitForTimeout(600);
const tally = p.locator(".run-tally");
ok(await tally.count() === 1, "the run ends on a tally");

const rows = async () => tally.locator("tbody tr").evaluateAll((trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => {
    const i = td.querySelector("input");
    return i ? i.value : td.innerText.trim();
  }))
);
const before = await rows();
ok(before.some((r) => r[0] === "Handgun" && r[2].includes("Sample Compact 9")), "handgun rounds post to the handgun");
ok(before.some((r) => r[0] === "Rifle" && r[2].includes("Sample Arms SR-15")), "rifle rounds post to the rifle");
ok(before.some((r) => r[0] === "HG" && r[2].includes("Nothing")), "a weapon the categories do not declare posts nowhere");
const stat = async (label) => tally.locator(".run-tally-stats > div").filter({ hasText: new RegExp(label, "i") }).locator(".run-v").innerText();
ok((await stat("Skipped")) === "1", `the skipped string is counted on the summary (${await stat("Skipped")})`);
ok((await stat("Strings Fired")) === String(strings - 1), `strings fired excludes the skipped one (${await stat("Strings Fired")} of ${strings})`);

const total = () => tally.locator(".run-tally-total td").nth(1).innerText();
const t0 = Number(await total());
const firstInput = tally.locator("tbody input").first();
await firstInput.fill(String(Number(await firstInput.inputValue()) + 2));
await p.waitForTimeout(250);
ok(Number(await total()) === t0 + 2, `a corrected count moves the total (${t0} -> ${await total()})`);
ok((await tally.innerText()).includes("Corrected"), "a corrected tally says so");

await p.keyboard.press("Escape");
await p.waitForTimeout(250);
ok(/escape again to discard/i.test(await tally.innerText()), "one escape warns rather than discarding");
ok(await p.locator(".run-tally").count() === 1, "the tally is still there after one escape");
await p.keyboard.press("Escape");
await p.waitForURL(/\/courses\/[a-f0-9-]+$/, { timeout: 15000 });
ok(true, "a second escape leaves the run");

console.log(fails === 0 ? "ALL PASS" : `TOTAL FAILURES: ${fails}`);
await b.close();
process.exit(fails === 0 ? 0 : 1);
