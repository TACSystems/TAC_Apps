import type Database from "better-sqlite3-multiple-ciphers";
import { CHANGELOG_MD } from "./changelog-data";

export type ChangeItem = { text: string; children: string[] };
export type ChangeSection = { title: string; items: ChangeItem[] };
export type ChangeVersion = { version: string; date: string; sections: ChangeSection[]; intro: string[] };

export function parseChangelog(md: string = CHANGELOG_MD): ChangeVersion[] {
  const versions: ChangeVersion[] = [];
  let v: ChangeVersion | null = null;
  let sec: ChangeSection | null = null;
  for (const line of md.split(/\r?\n/)) {
    const vh = line.match(/^## \[([^\]]+)\]\s*[—-]\s*(.+)$/);
    if (vh) {
      v = { version: vh[1], date: vh[2].trim(), sections: [], intro: [] };
      versions.push(v);
      sec = null;
      continue;
    }
    if (!v) continue;
    const sh = line.match(/^### (.+)$/);
    if (sh) {
      sec = { title: sh[1].trim(), items: [] };
      v.sections.push(sec);
      continue;
    }
    const top = line.match(/^- (.+)$/);
    if (top && sec) {
      sec.items.push({ text: top[1], children: [] });
      continue;
    }
    const sub = line.match(/^\s{2,}- (.+)$/);
    if (sub && sec && sec.items.length) {
      sec.items[sec.items.length - 1].children.push(sub[1]);
      continue;
    }
    if (line.trim() && !sec) v.intro.push(line.trim());
  }
  return versions.filter((x) => !/planned/i.test(x.date));
}

export function currentVersion() {
  return process.env.TAC_LOG_VERSION ?? null;
}

export function whatsNewPending(db: Database.Database): string | null {
  const v = currentVersion();
  if (!v) return null;
  const row = db.prepare(`select value from app_settings where key = 'whats_new_seen'`).get() as
    | { value: string }
    | undefined;
  const seen = row ? JSON.parse(row.value) : null;
  if (seen === v) return null;
  return parseChangelog().some((x) => x.version === v) ? v : null;
}

export function markWhatsNewSeen(db: Database.Database) {
  const v = currentVersion();
  if (!v) return;
  db.prepare(
    `insert into app_settings (key, value) values ('whats_new_seen', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify(v));
}
