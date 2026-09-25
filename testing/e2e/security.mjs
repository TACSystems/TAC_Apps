const W = process.env.TL_WORK || "/tmp/tl-test";
import { chromium } from "playwright";
import fs from "fs";
import { execSync } from "child_process";
const base = "http://127.0.0.1:3100";
const DIR = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();

await p.addInitScript(() => { setInterval(() => { const d = document.querySelector("[role=alertdialog]"); if (d) { const bs = d.querySelectorAll("button"); bs[bs.length - 1].click(); } }, 150); });
p.on("dialog", d => d.accept());
p.on("pageerror", e => console.log("PAGEERROR", e.message));
const ok = (c, m) => console.log(c ? "PASS" : "FAIL", m);
const body = async () => (await p.locator("body").innerText()).toLowerCase();
const restart = () => execSync(`${new URL("../lib/start-server.sh", import.meta.url).pathname} ${DIR}`);
const sec = () => JSON.parse(fs.readFileSync(`${DIR}/security.json`, "utf8"));
const header = () => fs.readFileSync(`${DIR}/firearms.db`).subarray(0, 15).toString("latin1");

await p.goto(base + "/");
ok((await body()).includes("enter pin"), "legacy PIN migrated, lock screen shown");
for (let i = 1; i <= 4; i++) {
  await p.locator("input[type=password]").fill("9999");
  await p.getByRole("button", { name: "Unlock" }).click();
  await p.waitForTimeout(700);
}
ok((await body()).includes("1 attempt left before a 30 seconds wait"), "attempts-left message");
await p.locator("input[type=password]").fill("9999");
await p.getByRole("button", { name: "Unlock" }).click();
await p.waitForTimeout(900);
ok((await body()).includes("wait"), "cooldown after 5 wrong");
for (let i = 0; i < 30 && !sec().lockout?.unlock?.until; i++) await p.waitForTimeout(100);
ok(sec().lockout?.unlock?.until > Date.now(), "lockout persisted to security.json");
restart();
await p.goto(base + "/");
ok(await p.getByRole("button", { name: /Wait/ }).isVisible(), "cooldown survives restart");
const s1 = sec(); s1.lockout.unlock.until = Date.now() - 1; fs.writeFileSync(`${DIR}/security.json`, JSON.stringify(s1)); restart();
await p.goto(base + "/");
await p.locator("input[type=password]").fill("1234");
await p.getByRole("button", { name: "Unlock" }).click();
await p.waitForTimeout(1500);
ok((await body()).includes("maintenance"), "unlocked with PIN");
ok(fs.readdirSync(`${DIR}/pre-upgrade`).some(f => f.includes("before-" + process.env.TL_VERSION)), "pre-upgrade copy made");
ok((await body()).includes("see what's new"), "what's new banner");
ok((await body()).includes("powered by precision systems"), "footer tagline");
await p.getByText("Skip setup and tour", { exact: false }).click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(600);
await p.getByRole("link", { name: "See what's new" }).click(); await p.waitForTimeout(800);
ok((await body()).includes("0.4.1") , "changelog page renders");
await p.goto(base + "/"); await p.locator("form", { hasText: "was updated to" }).getByRole("button", { name: "Dismiss" }).click(); await p.waitForTimeout(800);
ok(!(await body()).includes("see what's new"), "banner dismissed");

await p.goto(base + "/inventory");
const fhref = await p.locator('main table a[href^="/inventory/"]').first().getAttribute("href");
const fname = (await p.locator('main table a[href^="/inventory/"]').first().innerText());
await p.goto(base + fhref + "/edit").catch(()=>{});
if (!(await p.locator("input[name=nickname]").count())) { await p.goto(base + fhref); await p.locator("summary", { hasText: /edit/i }).first().click().catch(()=>{}); }
if (await p.locator("details#details").count() && !(await p.locator("details#details").evaluate(d => d.open))) await p.locator("details#details > summary").click();
await p.locator("input[name=nickname]").first().fill("Old Reliable");
await p.locator("form:has(input[name=nickname])").getByRole("button").last().click();
await p.waitForTimeout(1500);
await p.goto(base + "/inventory");
ok((await body()).includes("old reliable ("), "nickname shows with make/model (Both)");
await p.goto(base + "/search?q=reliable");
ok((await body()).includes("old reliable"), "search matches nickname");
await p.goto(base + "/range-log");
const rl = await body();
ok(/\d{2}\/\d{2}\/\d{4}/.test(rl), "US date format in range log");

await p.goto(base + "/settings"); await p.getByRole("button", { name: "Expand All" }).click().catch(() => {});
await p.getByRole("button", { name: "Turn on encryption" }).click();
const encPanel = p.locator("div:has(> div > h3:has-text('Database Encryption'))");
const pw = encPanel.locator("input[type=password]");
await pw.nth(0).fill("1234"); await pw.nth(1).fill("correct horse"); await pw.nth(2).fill("correct horse");
await p.getByRole("button", { name: "Encrypt my data" }).click();
await p.waitForTimeout(4000);
const rk = (await p.locator(".recovery-card p.select-all").innerText()).trim();
ok(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){7}$/.test(rk), "recovery key shown: " + rk);
ok(!header().startsWith("SQLite format"), "database file is encrypted");
const rfile = execSync(`find ${DIR}/receipts -type f | head -1`).toString().trim();
ok(fs.readFileSync(rfile).subarray(0, 6).toString() === "TLENC1", "receipts encrypted at rest");
ok(fs.readdirSync(`${DIR}/pre-upgrade`).every(f => !fs.readFileSync(`${DIR}/pre-upgrade/${f}`).subarray(0,6).toString().startsWith("SQLite")), "pre-upgrade copy encrypted");
await p.getByRole("button", { name: "I've saved it" }).click();
const rel = rfile.split("/receipts/")[1];
const ri = await p.request.get(base + "/api/receipts/" + rel);
ok(ri.status() === 200 && (await ri.body()).subarray(0, 2).toString("hex") === "ffd8", "encrypted receipt image still served as JPEG");

await p.getByRole("button", { name: "Lock" }).click(); await p.waitForTimeout(1200);
ok((await body()).includes("enter password"), "locks to password screen");
await p.locator("input[type=password]").fill("wrong-password");
await p.getByRole("button", { name: "Unlock" }).click(); await p.waitForTimeout(1500);
ok((await body()).includes("4 attempts left"), "wrong password counted");
await p.locator("input[type=password]").fill("correct horse");
await p.getByRole("button", { name: "Unlock" }).click(); await p.waitForTimeout(2000);
{ const bb = await body(); if (!bb.includes("maintenance")) console.log("DEBUG url", p.url(), bb.slice(0, 600)); ok(bb.includes("maintenance") || (!bb.includes("enter password") && !bb.includes("attempt")), "unlocked with password"); }

restart();
await p.goto(base + "/");
await p.getByRole("button", { name: /recovery key/ }).click();
await p.locator("input[placeholder^=XXXX]").fill(rk.toLowerCase());
const rp = p.locator("input[type=password]");
await rp.nth(0).fill("new password 2"); await rp.nth(1).fill("new password 2");
await p.getByRole("button", { name: "Reset password and unlock" }).click(); await p.waitForTimeout(2500);
ok((await body()).includes("maintenance"), "recovery key reset password after restart");

await p.goto(base + "/settings"); await p.getByRole("button", { name: "Expand All" }).click().catch(() => {});
const dl0 = p.waitForEvent("download").catch(() => null);
const r0 = await p.request.get(base + "/api/export");
ok(r0.status() === 400, "plain backup refused while encrypted (no backup password)");
const bpw = p.locator("input[placeholder^='Backup password']");
await bpw.fill("backup-pass-1");
await p.locator("input[placeholder=Confirm]").fill("backup-pass-1");
await p.getByRole("button", { name: "Set", exact: true }).click(); await p.waitForTimeout(3000);
ok((await body()).includes("backup password saved"), "backup password saved");
const r1 = await p.request.get(base + "/api/export");
const bk = await r1.body();
ok(r1.headers()["content-disposition"].includes(".tlbak") && bk.subarray(0, 6).toString() === "TLBAK1", "backup is encrypted .tlbak");
fs.writeFileSync(W + "/test.tlbak", bk);
ok(!bk.includes(Buffer.from("SQLite format")), "no plaintext in backup");

fs.mkdirSync(W + "/v5bk", { recursive: true });
await p.locator("select").filter({ hasText: "Weekly" }).selectOption("daily");
await p.locator("input[placeholder='Choose a folder']").fill(W + "/v5bk");
await p.getByRole("button", { name: "Save", exact: true }).first().click(); await p.waitForTimeout(1500);
await p.getByRole("button", { name: "Back up now" }).click(); await p.waitForTimeout(3000);
ok(fs.readdirSync(W + "/v5bk").some(f => f.endsWith(".tlbak")), "automatic backup written to folder");

const fileInput = p.locator("input[type=file][name=file][accept*=tlbak]");
await fileInput.setInputFiles(W + "/test.tlbak");
await p.getByRole("button", { name: "Restore Backup" }).click(); await p.waitForTimeout(2500);
ok((await body()).includes("password-protected"), "restore asks for backup password");
await p.locator("input[placeholder='Backup password']").fill("nope-nope");
await p.getByRole("button", { name: "Restore Backup" }).click(); await p.waitForTimeout(3000);
ok((await body()).includes("wrong"), "wrong backup password rejected");
await p.locator("input[placeholder='Backup password']").fill("backup-pass-1");
await p.getByRole("button", { name: "Restore Backup" }).click(); await p.waitForTimeout(5000);
ok(!header().startsWith("SQLite format"), "restored DB stays encrypted");
await p.goto(base + "/inventory");
ok((await body()).includes("old reliable"), "restored data readable");

await p.goto(base + "/settings"); await p.getByRole("button", { name: "Expand All" }).click().catch(() => {});
await p.getByRole("button", { name: "Manage password" }).click();
await p.locator("input[type=password]").first().fill("new password 2");
await p.getByRole("button", { name: "Turn off encryption" }).click(); await p.waitForTimeout(4000);
ok(header().startsWith("SQLite format"), "encryption turned off, DB plaintext");
ok(fs.readFileSync(rfile).subarray(0, 6).toString() !== "TLENC1", "receipts decrypted");
await p.goto(base + "/");
ok((await body()).includes("maintenance"), "app open without lock after disabling");
await b.close();
