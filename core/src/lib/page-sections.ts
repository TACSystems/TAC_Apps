import type Database from "better-sqlite3-multiple-ciphers";

export type SectionState = Record<string, boolean>;

function readAll(db: Database.Database): Record<string, SectionState> {
  const row = db.prepare(`select value from app_settings where key = 'pageSections'`).get() as { value: string } | undefined;
  if (!row) return {};
  try {
    const v = JSON.parse(row.value);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writeAll(db: Database.Database, all: Record<string, SectionState>) {
  db.prepare(
    `insert into app_settings (key, value) values ('pageSections', ?) on conflict(key) do update set value = excluded.value`
  ).run(JSON.stringify(all));
}

export function pageSections(db: Database.Database, scope: string) {
  const state = readAll(db)[scope] ?? {};
  return (id: string, fallback: boolean) => (typeof state[id] === "boolean" ? state[id] : fallback);
}

export function setPageSections(db: Database.Database, scope: string, ids: string[], open: boolean) {
  const all = readAll(db);
  const s = { ...(all[scope] ?? {}) };
  for (const id of ids.slice(0, 60)) if (id) s[String(id).slice(0, 60)] = Boolean(open);
  all[String(scope).slice(0, 40)] = s;
  writeAll(db, all);
}
