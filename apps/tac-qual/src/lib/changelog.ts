import type Database from "better-sqlite3-multiple-ciphers";
import { parseProseChangelog, type ProseVersion } from "@core/lib/changelog-prose";
import { CHANGELOG_MD } from "./changelog-data";

export type { ProseVersion };

export function changelog(): ProseVersion[] {
  return parseProseChangelog(CHANGELOG_MD);
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
  let seen: unknown = null;
  if (row) {
    try {
      seen = JSON.parse(row.value);
    } catch {
      seen = row.value;
    }
  }
  if (seen === v) return null;
  return changelog().some((x) => x.version === v) ? v : null;
}

export function markWhatsNewSeen(db: Database.Database) {
  const v = currentVersion();
  if (!v) return;
  db.prepare(
    `insert into app_settings (key, value) values ('whats_new_seen', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify(v));
}
