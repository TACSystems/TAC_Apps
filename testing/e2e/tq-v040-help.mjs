import { chromium } from "playwright";
const base = process.env.TQ_BASE || "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const p = await b.newPage();
p.on("pageerror", e => console.log("PAGEERROR", e.message));
const fails = [];
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };

await p.goto(base + "/", { waitUntil: "networkidle" });
const VER = process.env.TQ_VERSION || "0.4.0";
ok((await p.locator("body").innerText()).includes(VER), `update notice names ${VER}`);
await p.getByRole("button", { name: "Dismiss" }).click();
await p.waitForTimeout(1500);
ok(!(await p.locator("body").innerText()).toLowerCase().includes("was updated to"), "notice gone after dismiss");
await p.reload({ waitUntil: "networkidle" });
ok(!(await p.locator("body").innerText()).toLowerCase().includes("was updated to"), "notice stays gone after reload");

await p.goto(base + "/help", { waitUntil: "networkidle" });
await p.locator("#help-scoring > summary").click();
ok((await p.locator("#help-scoring").innerText()).includes("Shift+Enter"), "help section opens with content");
const search = p.locator("[data-scope=help] input[type=search], [data-scope=help] input[type=text]").first();
if (await search.count()) {
  await search.fill("currency");
  await p.waitForTimeout(400);
  ok(await p.locator("#help-records").isVisible(), "help search keeps the matching guide");
  ok(!(await p.locator("#help-printing").isVisible()), "help search hides a non-matching guide");
}

await p.goto(base + "/settings/whats-new", { waitUntil: "networkidle" });
const t = await p.locator("body").innerText();
ok(t.includes(VER) && t.includes("0.4.0") && t.includes("0.3.0") && t.includes("0.1.0"), "every release listed, current one included");
ok(t.toLowerCase().includes("installed"), "installed badge shown");
ok(!t.includes("**"), "bold markers consumed by the parser");

await b.close();
console.log(fails.length ? `\n${fails.length} failed` : "\nall passed");
process.exit(fails.length ? 1 : 0);
