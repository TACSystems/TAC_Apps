const W = process.env.TL_WORK || "/tmp/tl-test";
import { chromium } from "playwright";
const base = "http://127.0.0.1:3100";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

await p.addInitScript(() => { setInterval(() => { const d = document.querySelector("[role=alertdialog]"); if (d && !window.__noAuto) { const bs = d.querySelectorAll("button"); bs[bs.length - 1].click(); } }, 150); });
let dialogs = []; let dialogAccept = true;
await p.addInitScript(() => { const f = () => document.querySelectorAll("details[data-section]").forEach(d => { if (!d.dataset.auto) { d.dataset.auto = "1"; d.open = true; } }); document.addEventListener("DOMContentLoaded", f); setInterval(f, 200); });
p.on("dialog", d => { dialogs.push(d.message()); dialogAccept ? d.accept() : d.dismiss(); });
p.on("pageerror", e => console.log("PAGEERROR", e.message));
const ok = (c, m) => console.log(c ? "PASS" : "FAIL", m);
const body = async () => (await p.locator("body").innerText()).toLowerCase();

await p.goto(base + "/inventory");
const countBtn = p.locator("main button[aria-expanded]").first();
ok(/\d+\s+firearms?/i.test(await countBtn.innerText()), "armory total count: " + (await countBtn.innerText()).replace(/\s+/g," "));
await countBtn.click();
ok((await body()).includes("by platform") && (await body()).includes("by caliber"), "totals breakdown by platform and caliber");
ok((await body()).includes("purchased"), "purchase line under firearm");
ok((await p.locator("thead").innerText()).toLowerCase().includes("firearm"), "header reads Firearm");
const rowsAll = await p.locator("tbody tr").count();
await p.getByRole("button", { name: /^Sold/ }).click(); await p.waitForTimeout(600); await countBtn.click(); await p.waitForTimeout(200);
const soldCount = Number((await countBtn.innerText()).match(/\d+/)[0]);
ok(soldCount === await p.locator("tbody tr").filter({ hasNot: p.locator("td[colspan]") }).count(), "status filter Sold: " + soldCount + " vs " + await p.locator("tbody tr").filter({ hasNot: p.locator("td[colspan]") }).count() + " url " + p.url());
await p.getByRole("button", { name: /^All/ }).click();
await p.getByRole("button", { name: /Rounds Fired/ }).click();
const shots = await p.locator("tbody tr td:nth-child(6)").allInnerTexts();
const nums = shots.map(t => Number(t.replace(/,/g, "")));
ok(nums.every((n, i) => i === 0 || nums[i - 1] >= n), "sort by rounds fired desc " + nums.join(","));
await p.getByRole("button", { name: /^Purchased/ }).click();
ok((await p.getByRole("button", { name: /^Purchased/ }).innerText()).match(/[▲▼]/), "sort by purchase date");

await p.goto(base + "/settings"); await p.getByRole("button", { name: "Expand All" }).click().catch(() => {});
await p.locator("select[name=firearmLabel]").selectOption("make_model_nickname");
await p.locator("#settings-display").getByRole("button", { name: "Save" }).click(); await p.waitForTimeout(1200);
await p.goto(base + "/inventory");
const fhref = await p.locator('tbody a[href^="/inventory/"]').first().getAttribute("href");
await p.goto(base + fhref);
await p.locator("summary", { hasText: /edit/i }).first().click().catch(() => {});
const nick = p.locator("input[name=nickname]").first();
if (await nick.count()) { await nick.fill("Zulu"); await p.locator("form:has(input[name=nickname])").getByRole("button").last().click(); await p.waitForTimeout(1500); }
await p.goto(base + "/inventory");
ok(/\(zulu\)/i.test(await p.locator("tbody").innerText()), "Make/Model (Nickname) display");

await p.goto(base + fhref);
ok((await p.locator("input[type=file]:visible").count()) === 0, "no native file inputs visible");
ok((await body()).includes("drag photos here"), "drop zone shown");
const photos = p.locator("#photos");
const before = await photos.locator("img").count();
await photos.locator("input[type=file]").setInputFiles([new URL("../assets/photo1.jpg", import.meta.url).pathname]);
await p.waitForTimeout(2500);
ok((await photos.locator("img").count()) === before + 1, "pick uploads immediately");
ok(/\d{1,2}:\d{2} (am|pm)/i.test(await photos.innerText()), "local time with AM/PM on upload");
const zone = photos.locator("[role=button]").first();
await zone.hover();
await p.evaluate(async () => {
  const blob = await (await fetch("/icon.svg")).blob();
  const c = document.createElement("canvas"); c.width = 40; c.height = 30; c.getContext("2d").fillRect(0, 0, 40, 30);
  const png = await new Promise(r => c.toBlob(r, "image/png"));
  const dt = new DataTransfer(); dt.items.add(new File([png], "image.png", { type: "image/png" }));
  document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
});
await p.waitForTimeout(2500);
ok((await photos.locator("img").count()) === before + 2, "paste to upload");
ok((await photos.innerText()).toLowerCase().includes("pasted-"), "pasted file gets a name");
await photos.locator("img").first().click();
ok(await p.locator("[role=dialog] img").isVisible(), "photo viewer opens");
await p.keyboard.press("ArrowRight");
ok((await p.locator("[role=dialog]").innerText()).includes("2 /"), "viewer arrows step");
await p.keyboard.press("Escape");
ok(!(await p.locator("[role=dialog]").count()), "Esc closes viewer");

const sale = p.locator("#disposition details summary");
ok(/record sale \/ transfer|add another record/i.test(await sale.innerText()), "sale/transfer is a button: " + await sale.innerText());
await sale.click();
ok(await p.locator("#disposition input[name=recipient_name]").first().isVisible(), "sale form opens");

await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(300);
const hb = await p.locator("header").boundingBox();
ok(hb && Math.abs(hb.y) < 1, "tab bar sticky on scroll");

await p.goto(base + fhref);
await p.locator("summary", { hasText: /edit/i }).first().click().catch(() => {});
await p.locator("input[name=nickname]").first().fill("Changed"); await p.waitForTimeout(300);
console.log("DIRTY", await p.evaluate(() => [globalThis.__taclogDirty?.size, typeof window.taclogConfirm, document.querySelectorAll("header a[href='/ammo']").length]), p.url());
dialogs = []; dialogAccept = false; await p.evaluate(() => { window.__noAuto = true; });
await p.locator("header a[href='/ammo']").click(); await p.waitForTimeout(200); console.log("URL200", p.url(), await p.locator("[role=alertdialog]").count()); await p.waitForTimeout(800);
const ud = (await p.locator("[role=alertdialog]").innerText().catch(() => "")).toLowerCase();
await p.locator("[role=alertdialog]").getByRole("button", { name: /stay/i }).click().catch(() => {}); await p.waitForTimeout(300);
ok((dialogs.some(d => d.includes("unsaved")) || ud.includes("unsaved")) && p.url().includes(fhref), "unsaved warning keeps you on page: " + JSON.stringify(dialogs) + " ud=" + ud + " url=" + p.url() + " fhref=" + fhref);
dialogAccept = true; await p.evaluate(() => { window.__noAuto = false; });
await p.locator("header a[href='/ammo']").click(); await p.waitForTimeout(1500);
ok(p.url().endsWith("/ammo"), "confirming leaves page");

await p.goto(base + "/courses");
const logLink = p.locator('a[href$="/log"]').first();
await p.goto(base + await logLink.getAttribute("href"));
ok((await p.locator("[name='field:weapon_used']").count()) === 0 && !(await body()).includes("weapon used"), "Weapon Used removed from log form");

await p.goto(base + "/settings"); await p.getByRole("button", { name: "Expand All" }).click().catch(() => {});
await p.getByRole("button", { name: /Set a PIN/ }).click();
const pinField = p.locator("input[type=password]").first();
await pinField.fill("4321");
await p.locator("button[aria-label=Show]").first().click();
ok((await p.locator("input[type=text][inputmode=numeric]").count()) >= 1, "show-password toggle reveals text");

await p.goto(base + "/stats");
const svg = await p.locator("svg text").allInnerTexts().catch(() => []);
ok(!svg.some(t => /^\d{2}-\d{2}$/.test(t)), "chart axis uses US format");
await b.close();
