const D = require("../../node_modules/better-sqlite3-multiple-ciphers");
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const MAP = [
  ["Stag Arms STAG 15", "Sample Arms SR-15"], ["Glock 19X", "Sample Pistol 19"], ["Glock 43X", "Sample Compact 9"],
  ["Taurus Slim PT 709", "Sample Slim 9"], ["Test Glock", "Test Pistol A"], ["Coyote", "Ranger"],
  ["Holosun 507C", "Sample Red Dot"], ["Aimpoint PRO", "Sample Rifle Optic"], ["STG123", "TEST-0003"],
  ["AFXK221", "TEST-0004"], ["TZ55555", "TEST-0005"], ["HS507-1", "TEST-ACC-1"], ["AP9001", "TEST-ACC-2"],
  ["1-23-456", "9-99-99999"], ["Local Shop", "Sample Gun Shop"], ["Sportsman's", "Sample Outdoors"], ["John Buyer", "Test Buyer"], ["Thunder Ridge Range", "Sample Range"], ["Brad", "Test Shooter"],
];
const tmp = out + ".tmp";
fs.rmSync(tmp, { force: true }); fs.copyFileSync(src, tmp);
for (const x of ["-wal", "-shm"]) if (fs.existsSync(src + x)) fs.copyFileSync(src + x, tmp + x);
const d = new D(tmp);
d.pragma("journal_mode = DELETE");
d.exec("drop view if exists ammo_stock; drop view if exists ammo_on_hand;");
const views = [];
const tables = d.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'").all().map((r) => r.name);
let n = 0;
for (const t of tables) {
  const cols = d.prepare(`pragma table_info("${t}")`).all().filter((c) => !c.type || /TEXT|CHAR|CLOB/i.test(c.type)).map((c) => c.name);
  for (const c of cols) for (const [a, b] of MAP) n += d.prepare(`update "${t}" set "${c}" = replace("${c}", ?, ?) where instr("${c}", ?) > 0`).run(a, b, a).changes;
}
fs.rmSync(out, { force: true });
d.prepare("vacuum into ?").run(out);
d.close();
for (const x of ["", "-wal", "-shm", "-journal"]) fs.rmSync(tmp + x, { force: true });
const o = new D(out, { readonly: true });
const hay = [];
for (const t of tables) { const cols = o.prepare(`pragma table_info("${t}")`).all().map((c) => c.name); for (const r of o.prepare(`select * from "${t}"`).all()) for (const c of cols) if (typeof r[c] === "string") hay.push(r[c]); }
o.close();
const raw = fs.readFileSync(out).toString("latin1");
const left = MAP.filter(([a]) => raw.includes(a) || hay.some((h) => h.includes(a))).map(([a]) => a);
console.log(out, "replacements", n, "leftover", JSON.stringify(left));
