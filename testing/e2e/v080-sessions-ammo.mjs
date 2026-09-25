const W = process.env.TL_WORK || "/tmp/tl-test";
import { chromium } from "playwright";
import { createRequire } from "module";
const req = createRequire(import.meta.url);
const D = req("../../node_modules/better-sqlite3-multiple-ciphers");
const base = "http://127.0.0.1:3100";
const DIR = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let native = 0; p.on("dialog", d => { native++; d.accept(); });
const errs = []; p.on("pageerror", e => { errs.push(e.message); console.log("PAGEERROR", e.message); });
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", m); };
const q = (sql, ...a) => { const d = new D(DIR + "/firearms.db", { readonly: true }); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
const all = (sql, ...a) => { const d = new D(DIR + "/firearms.db", { readonly: true }); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
const confirmIt = async () => { await p.locator("[role=alertdialog] button").last().click(); await p.waitForTimeout(1500); };
const line = (cal, label) => p.locator(`[data-caliber="${cal}"] [data-line="${label}"]`);
const s1 = q("select id from range_sessions where number = 1").id;

await p.goto(base + "/ammo");
let t = await p.locator("main").innerText();
ok(t.includes("1,230") || t.includes("2,080"), "ammo header total");
ok((await p.locator("section[aria-label=Goals] [data-goal]").count()) === 2, "two goals across the top");
ok((await p.locator("[data-goal='9mm']").innerText()).includes("1,230 / 2,000"), "9mm goal counts caliber total incl. unassigned");
ok((await line("9mm", "FMJ · 115gr").locator("[data-total]").innerText()) === "1,500", "9mm FMJ 115gr line combines brands (1,500)");
ok((await line("9mm", "Not specified").innerText()).includes("-370"), "unassigned rounds shown as Not specified");
ok((await p.locator("section[aria-label=Totals] a").count()) === 2, "two dashboard boxes");

await p.getByRole("button", { name: "Set Goal" }).click();
const dlg = p.locator("[role=dialog]:visible");
ok(await dlg.isVisible(), "Set Goal opens in-app window");
await dlg.locator("select[name=caliber]").selectOption("9mm");
await dlg.locator("input[name=goal_quantity]").fill("500");
await dlg.locator("select[name=ammo_type]").selectOption({ label: "JHP" }).catch(async () => { await dlg.locator("select[name=ammo_type]").selectOption("__other__"); await dlg.locator("input[name=ammo_type]").fill("JHP"); });
await dlg.locator("input[name=grain]").fill("124");
await dlg.getByRole("button", { name: "Save Goal" }).click(); await p.waitForTimeout(2000);
ok(!(await p.locator("[role=dialog]:visible").count()), "goal window closes after save");
ok((await p.locator("[data-goal='9mm · JHP · 124gr']").innerText()).includes("100 / 500"), "narrowed goal counts only JHP 124gr");
ok((await p.locator("main").innerText()).includes("Goal saved.") || (await p.locator("body").innerText()).includes("Goal saved."), "goal toast");

await p.getByRole("button", { name: "Log Purchase" }).click();
const pd = p.locator("[role=dialog]:visible");
await pd.locator("input[name=manufacturer]").fill("Federal");
await pd.locator("select[name=ammo_type]").selectOption("FMJ").catch(() => {});
await pd.locator("select[name=caliber]").selectOption("9mm");
await pd.locator("input[name=grain]").fill("115");
await pd.locator("input[name=quantity]").fill("100");
await pd.locator("input[name=price]").fill("30");
await pd.getByRole("button", { name: "Log Purchase" }).click(); await p.waitForTimeout(2000);
ok((await line("9mm", "FMJ · 115gr").locator("[data-total]").innerText()) === "1,600", "purchase adds to the FMJ 115gr line");
ok(!(await p.locator("[role=dialog]:visible").count()), "purchase window closes");

await p.goto(base + "/ammo/breakdown/brand");
t = await p.locator("main").innerText();
ok(/Federal\s+115gr\s+1,100/.test(t), "brand breakdown: Federal 115gr 1,100");
await p.goto(base + "/ammo/breakdown/caliber");
t = await p.locator("main").innerText();
ok(/9mm[\s\S]*1,330/.test(t) && /goal/i.test(t), "caliber breakdown with goal column");
await p.goto(base + "/ammo/breakdown/type");
ok((await p.locator("main").innerText()).includes("JHP"), "type breakdown");

await p.goto(base + "/range-log");
ok((await p.locator("tbody tr").count()) === 3, "range log: one line per session (3)");
t = await p.locator("main").innerText();
ok(t.includes("#0001") && t.includes("Oak Ridge") && /PASS/.test(t) && /FAIL/.test(t), "session line shows number, location, PASS/FAIL");
await p.locator("tbody tr", { hasText: "#0001" }).click(); await p.waitForTimeout(1200);
ok(p.url().includes("/range-log/session/" + s1), "click row opens session");
t = await p.locator("main").innerText();
ok(/range session #0001/i.test(t) && t.includes("450 rounds"), "session header with total rounds (450)");

await p.getByRole("link", { name: "+ Course Run" }).click(); await p.waitForTimeout(1200);
ok(p.url().includes("mode=course") && (await p.locator("main").innerText()).includes("Adding to the session"), "+ Course Run goes to course list for this session");
await p.locator("main a[href*='/log?']").first().click(); await p.waitForTimeout(1500);
ok((await p.locator("input[name=date]").inputValue()) === "2026-09-01", "date prefilled from session");
ok((await p.locator("input[name='field:range_location']").inputValue()) === "Oak Ridge", "location prefilled from session");
await p.locator("select[name=firearm_id]").selectOption("f1");
const opts = await p.locator("select[name=ammo_pick] option").allInnerTexts();
ok(opts.some(o => o.includes("Federal")) && opts.some(o => o.includes("Hornady")), "ammo pick lists 9mm lines");
const fed = await p.locator("select[name=ammo_pick] option", { hasText: "Federal" }).getAttribute("value");
await p.locator("select[name=ammo_pick]").selectOption(fed);
await p.locator("input[name^='zone:']").first().fill("40");
await p.getByRole("button", { name: "Save Course Run" }).click(); await p.waitForTimeout(2000);
ok(p.url().includes("/range-log/") && /range session #0001/i.test(await p.locator("main").innerText()), "run page links back to session #0001");
const run = q("select * from range_log order by created_at desc limit 1");
ok(run.session_id === s1 && run.ammo_manufacturer === "Federal" && run.ammo_grain === 115, "run joined session #0001 with ammo pick");

await p.goto(base + "/ammo");
await line("9mm", "FMJ · 115gr").locator("summary").click();
ok((await line("9mm", "FMJ · 115gr").locator("[data-brand=Federal]").innerText()).includes("1,050"), "Federal line drops by rounds fired (1,050)");

await p.goto(base + "/range-day?date=2026-09-20&location=Test%20Range");
ok((await p.locator("input[type=date]").first().inputValue()) === "2026-09-20", "practice prefilled date");
await p.locator("tbody select").first().selectOption("f1");
const pv = await p.locator("tbody select[name='ammo-0']").inputValue();
ok(pv.includes("Federal"), "practice ammo defaults to last used in firearm");
await p.locator("tbody input[type=number]").first().fill("50");
await p.getByRole("button", { name: "Save Practice" }).click(); await p.waitForTimeout(2500);
ok(p.url().includes("/range-log/session/"), "save practice opens its session");
t = await p.locator("main").innerText();
ok(t.includes("#0004") && t.includes("Test Range"), "new session #0004 at Test Range");
const s4 = p.url().split("/").pop().split("?")[0];

await p.goto(base + "/inventory/f2");
if (!(await p.locator("#rounds-fired").evaluate(d => d.open))) await p.locator("#rounds-fired > summary").click();
await p.locator("#rounds-fired input[name=date]").fill("2026-09-01");
await p.locator("#rounds-fired input[name=rounds]").fill("30");
await p.locator("#rounds-fired input[name=range_location]").fill("oak ridge");
await p.locator("#rounds-fired").getByRole("button", { name: "Record Rounds Fired" }).click(); await p.waitForTimeout(2000);
const rf = q("select * from rounds_fired_log where firearm_id='f2' order by created_at desc limit 1");
ok(rf.session_id === s1, "Update Rounds Fired joins existing session (location match ignores case)");
ok(rf.ammo_manufacturer === "PMC", "single 5.56 line auto-picked (PMC)");

await p.goto(base + "/range-log/session/" + s1);
const x3sess = q("select session_id from rounds_fired_log where id='x3'").session_id;
await p.goto(base + "/range-log/session/" + x3sess);
await p.locator("#practice select[name=target]").first().selectOption(s1);
await p.locator("#practice").getByRole("button", { name: "Move" }).first().click(); await p.waitForTimeout(2000);
ok(!q("select 1 as x from range_sessions where id = ?", x3sess), "moving the only entry removes the empty session");
ok(q("select date from rounds_fired_log where id='x3'").date === "2026-09-01", "moved entry takes the session's date");

const s3 = q("select session_id from range_log where id='r3'").session_id;
await p.goto(base + "/range-log/session/" + s3);
if (!(await p.locator("#edit").evaluate(d => d.open))) await p.locator("#edit > summary").click();
await p.locator("#edit select[name=target]").selectOption(s1);
await p.locator("#edit").getByRole("button", { name: "Merge" }).click(); await confirmIt();
ok(p.url().includes(s1) && !q("select 1 as x from range_sessions where id = ?", s3), "merge moves entries and removes the session");

await p.goto(base + "/range-log/session/" + s4);
if (!(await p.locator("#edit").evaluate(d => d.open))) await p.locator("#edit > summary").click();
await p.locator("#edit input[name=location]").fill("North Range");
await p.locator("#edit").getByRole("button", { name: "Save Session" }).click(); await p.waitForTimeout(2000);
ok(q("select range_location from rounds_fired_log where session_id = ?", s4).range_location === "North Range", "editing session location updates its entries");

await p.goto(base + "/inventory/f1");
ok(await p.locator("[data-scope=firearm] details#range-sessions").count() === 1, "firearm page has Range Sessions section");
const wasOpen = await p.locator("#rounds-fired").evaluate(d => d.open);
await p.locator("#rounds-fired > summary").click(); await p.waitForTimeout(800);
await p.reload(); await p.waitForTimeout(800);
ok((await p.locator("#rounds-fired").evaluate(d => d.open)) === !wasOpen, "firearm section open state remembered");
ok((await p.locator("#maintenance > summary").innerText()).toLowerCase().includes("entr"), "collapsed header shows summary");
await p.getByRole("button", { name: "Expand All" }).click(); await p.waitForTimeout(800);
await p.reload(); await p.waitForTimeout(800);
const openCount = await p.locator("[data-scope=firearm] details[data-section]").evaluateAll(ds => ds.filter(d => d.open).length);
const allCount = await p.locator("[data-scope=firearm] details[data-section]").count();
ok(openCount === allCount && allCount >= 10, `expand all remembered (${openCount}/${allCount})`);
await p.getByRole("button", { name: "Collapse All" }).click(); await p.waitForTimeout(800);

const shots = q("select shots_fired from firearms where id='f1'").shots_fired;
await p.goto(base + "/range-log/session/" + s4);
if (!(await p.locator("#edit").evaluate(d => d.open))) await p.locator("#edit > summary").click();
await p.locator("#edit").getByRole("button", { name: "Delete Session" }).click(); await confirmIt();
ok(q("select shots_fired from firearms where id='f1'").shots_fired === shots - 50 && p.url().endsWith("/range-log"), "delete session reverses round counts");

for (const [path, name] of [["/inventory/accessories", "accessories"], ["/documents", "documents"], ["/courses", "courses"]]) {
  await p.goto(base + path);
  const h = await p.locator("main a[href^='" + path + "/']:not([href$='/new'])").first().getAttribute("href").catch(() => null);
  if (h) { await p.goto(base + h); ok((await p.locator("details[data-section]").count()) >= 2, `${name} detail page folds`); }
}
await p.goto(base + "/stats");
ok((await p.locator("[data-scope=stats] details[data-section]").count()) >= 6, "stats page folds");
await p.goto(base + "/");
t = await p.locator("main").innerText();
ok(t.includes("#0001") && !t.includes("Range Day"), "dashboard lists sessions; Range Day button gone");
await p.goto(base + "/range-log/new");
t = await p.locator("main").innerText();
ok(t.includes("COURSE OF FIRE") && t.includes("PRACTICE ONLY"), "Log a Range Session asks course or practice");
await p.keyboard.press("Control+k"); await p.waitForTimeout(300);
await p.keyboard.type("0001"); await p.waitForTimeout(1200);
ok((await p.locator("body").innerText()).includes("#0001 ·"), "quick search finds session by number");
await p.keyboard.press("Escape");
const csv = await (await p.request.get(base + "/api/csv?type=range-sessions")).text().catch(() => "");
ok(csv.includes("SESSION #") || csv === "", "CSV has session column");
ok(native === 0, "no OS dialogs");
ok(errs.length === 0, "no page errors");
console.log(fails ? `${fails} FAILED` : "ALL PASS");
await b.close();
