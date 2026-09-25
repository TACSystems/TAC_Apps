const W = process.env.TL_WORK || "/tmp/tl-test";
import { createRequire } from "module";
import fs from "fs";
const req = createRequire(import.meta.url);
const D = req("../../node_modules/better-sqlite3-multiple-ciphers");
const db = new D(process.argv[2], { readonly: true });
const purpose = {
  firearms: "Each firearm: identity, purchase details, status, lifetime rounds fired and cleaning counters.",
  attachments: "Photos, receipts, bills of sale and document scans. Files live in data/receipts (sealed when encryption is on); this row points at them.",
  firearm_dispositions: "Sale / transfer records for a firearm.",
  accessories: "Serialized accessories (optics, lights, suppressors) and which firearm they are mounted on now.",
  accessory_mounts: "History of which firearm an accessory was mounted on, and when.",
  maintenance_log: "Cleaning, inspection, repair and part-replacement entries. Only type Cleaning resets the cleaning counter.",
  malfunction_log: "Malfunctions with the round count at the time.",
  zero_records: "Zero data per firearm (distance, optic, ammo, adjustment).",
  ammo_purchases: "Every ammo purchase. On hand is computed, never stored.",
  ammo_goals: "Ammo goals per caliber, optionally narrowed to a type and grain (unique on caliber + type + grain).",
  range_sessions: "One trip to the range: date + location, numbered (#0001…). Entries join automatically by date and location.",
  target_types: "Reusable targets; each has scoring zones.",
  target_type_zones: "Scoring zones (label + point value) for a target type.",
  courses_of_fire: "Courses of fire: details, passing score, columns, scorecard fields and categories (JSON).",
  cof_phases: "Phases of a course.",
  cof_strings: "Strings (and instruction/transition rows) within a phase; custom column values in extra_json.",
  range_log: "Course runs: one scored run of a course by one firearm, with zone counts, score, ammo used and its session.",
  range_log_zone_counts: "Hits per scoring zone for a course run.",
  dropdown_options: "Editable dropdown lists (calibers, platforms, locations, weather, categories…).",
  rounds_fired_log: "Practice rounds per firearm (not scored), with ammo used, location and session.",
  app_settings: "Key/value settings (JSON values): display, defaults, dashboard layout, remembered sections, backup settings, tour state.",
  documents: "Permits, NFA stamps, memberships and licenses with issue/expiry dates.",
  checklist_items: "Range bag (and other) checklist items with checked state.",
  count_adjustments: "Dated count corrections: firearm rounds fired, or ammo on hand for a caliber/type/grain/brand line.",
  firearm_counters: "Part counters (barrel, springs…) measured from a starting shot count.",
  schema_migrations: "Numbered upgrade steps already applied (0.9.0+).",
};
const views = { ammo_stock: "Computed: purchased − fired + corrections per caliber/type/grain/brand line. Fired rows with no ammo pick form the 'Not specified' line.", ammo_on_hand: "Computed: ammo_stock totals per caliber (plus calibers that only have goals)." };
let md = `# TAC-LOG database schema\n\nGenerated from a fresh v0.9.0 database. SQLite (SQLCipher when encryption is on), file \`firearms.db\` in the data folder. Upgrades are numbered steps in \`apps/tac-log/src/lib/db/index.ts\` (\`MIGRATIONS\`), recorded in \`schema_migrations\`.\n\n`;
const tables = db.prepare(`select name from sqlite_master where type='table' and name not like 'sqlite_%' order by rowid`).all();
for (const { name } of tables) {
  md += `## ${name}\n\n${purpose[name] ?? ""}\n\n| Column | Type | Notes |\n| --- | --- | --- |\n`;
  const fks = db.prepare(`pragma foreign_key_list(${name})`).all();
  for (const c of db.prepare(`pragma table_info(${name})`).all()) {
    const fk = fks.find((f) => f.from === c.name);
    const notes = [c.pk ? "primary key" : "", c.notnull ? "required" : "", c.dflt_value != null ? `default ${c.dflt_value}` : "", fk ? `→ ${fk.table}.${fk.to} (${fk.on_delete.toLowerCase()})` : ""].filter(Boolean).join(", ");
    md += `| ${c.name} | ${c.type || "—"} | ${notes} |\n`;
  }
  md += "\n";
}
md += `## Views\n\n`;
for (const [v, d] of Object.entries(views)) md += `- **${v}**: ${d}\n`;
fs.writeFileSync(process.argv[3], md);
console.log(tables.length, "tables");
