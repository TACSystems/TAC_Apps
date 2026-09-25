const W = process.env.TL_WORK || "/tmp/tl-test";
import { chromium } from "playwright";
const b = await chromium.connectOverCDP("http://127.0.0.1:9335");
let p; for (let i = 0; i < 40; i++) { p = b.contexts()[0]?.pages().find((x) => x.url().startsWith("http://127.0.0.1")); if (p) break; await new Promise(r => setTimeout(r, 500)); }
await p.waitForLoadState("domcontentloaded"); await p.waitForTimeout(2000);
const t = await p.locator("body").innerText();
console.log("URL", p.url().replace(/\?.*/, ""), "| version:", (t.match(/v0\.\d+\.\d+/) || [])[0], "| welcome:", /welcome/i.test(t), "| whatsnew:", /updated to 0\.9\.0/i.test(t), "| firearms:", (t.match(/(\d+) firearms? in the armory/i) || [])[1]);
await p.goto(p.url().split("/").slice(0, 3).join("/") + "/settings"); await p.waitForTimeout(1500);
console.log("update state:", JSON.stringify(await p.evaluate(() => window.taclog?.updateState?.())));
console.log("settings updates section:", await p.locator("#settings-updates").count(), "| update status:", (await p.locator("[data-update-status]").innerText().catch(() => "?")).slice(0, 80));
await b.close().catch(() => {});
