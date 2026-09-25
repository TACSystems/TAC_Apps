import type Database from "better-sqlite3-multiple-ciphers";

export type Migration = { id: number; name: string; up: (db: Database.Database) => void };

type ColumnInfo = { name: string; notnull: number };

export function columns(db: Database.Database, table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

export function tableExists(db: Database.Database, table: string) {
  return Boolean(db.prepare(`select 1 from sqlite_master where type = 'table' and name = ?`).get(table));
}

export function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string) {
  if (!columns(db, table).some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    return true;
  }
  return false;
}

export function appliedMigrations(db: Database.Database) {
  db.exec(`create table if not exists schema_migrations (id integer primary key, name text not null, applied_at text not null default (datetime('now')))`);
  return new Set((db.prepare(`select id from schema_migrations`).all() as { id: number }[]).map((r) => r.id));
}

export function runMigrations(db: Database.Database, list: Migration[], upTo = Infinity) {
  const ids = new Set<number>();
  for (const m of list) {
    if (ids.has(m.id)) throw new Error(`Duplicate migration id ${m.id}.`);
    ids.add(m.id);
  }
  const done = appliedMigrations(db);
  const ran: number[] = [];
  for (const m of [...list].sort((a, b) => a.id - b.id)) {
    if (m.id > upTo || done.has(m.id)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare(`insert into schema_migrations (id, name) values (?, ?)`).run(m.id, m.name);
    })();
    ran.push(m.id);
  }
  return ran;
}
