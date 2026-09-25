import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";

export type EntryTable = "range_log" | "rounds_fired_log";

export type RangeSession = {
  id: string;
  number: number;
  date: string;
  location: string | null;
  notes: string | null;
  created_at: string;
};

export type SessionSummary = RangeSession & {
  rounds: number;
  firearms: string | null;
  runs: number;
  practice: number;
  courses_json: string | null;
};

export function sessionNo(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export function cleanLocation(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 200) : null;
}

export function findOrCreateSession(db: Database.Database, date: string, location: string | null) {
  const loc = cleanLocation(location);
  const found = db
    .prepare(
      `select id from range_sessions where date = ? and lower(coalesce(location, '')) = lower(?) order by number limit 1`
    )
    .get(date, loc ?? "") as { id: string } | undefined;
  if (found) return found.id;
  const next = (db.prepare(`select coalesce(max(number), 0) + 1 as n from range_sessions`).get() as { n: number }).n;
  const id = randomUUID();
  db.prepare(`insert into range_sessions (id, number, date, location) values (?, ?, ?, ?)`).run(id, next, date, loc);
  return id;
}

export function assignEntry(db: Database.Database, table: EntryTable, id: string) {
  const row = db.prepare(`select date, range_location from ${table} where id = ?`).get(id) as
    | { date: string; range_location: string | null }
    | undefined;
  if (!row) return null;
  const sessionId = findOrCreateSession(db, row.date, row.range_location);
  db.prepare(`update ${table} set session_id = ? where id = ?`).run(sessionId, id);
  pruneSessions(db);
  return sessionId;
}

export function pruneSessions(db: Database.Database) {
  db.exec(`
    delete from range_sessions
    where id not in (select session_id from range_log where session_id is not null)
      and id not in (select session_id from rounds_fired_log where session_id is not null)
  `);
}

export function backfillSessions(db: Database.Database) {
  const pending = db
    .prepare(
      `select 'range_log' as t, id, date, created_at from range_log where session_id is null
       union all
       select 'rounds_fired_log' as t, id, date, created_at from rounds_fired_log where session_id is null
       order by date, created_at`
    )
    .all() as { t: EntryTable; id: string; date: string; created_at: string }[];
  if (!pending.length) return 0;
  db.transaction(() => {
    const notes = db.prepare(`select notes from rounds_fired_log where id = ? and range_location is null`);
    const setLoc = db.prepare(`update rounds_fired_log set range_location = ?, notes = ? where id = ?`);
    for (const p of pending) {
      if (p.t === "rounds_fired_log") {
        const n = notes.get(p.id) as { notes: string | null } | undefined;
        const m = n?.notes?.match(/^Range Day at (.+?)(?: · ([\s\S]*)|$)/);
        if (m) setLoc.run(m[1].trim(), m[2]?.trim() || null, p.id);
        else {
          const plain = n?.notes?.match(/^Range Day(?: · ([\s\S]*))?$/);
          if (plain) db.prepare(`update rounds_fired_log set notes = ? where id = ?`).run(plain[1]?.trim() || null, p.id);
        }
      }
      const row = db.prepare(`select date, range_location from ${p.t} where id = ?`).get(p.id) as {
        date: string;
        range_location: string | null;
      };
      db.prepare(`update ${p.t} set session_id = ? where id = ?`).run(findOrCreateSession(db, row.date, row.range_location), p.id);
    }
  })();
  return pending.length;
}

export function moveEntry(db: Database.Database, table: EntryTable, id: string, target: string) {
  db.transaction(() => {
    let sessionId = target;
    if (target === "new") {
      const row = db.prepare(`select date, range_location from ${table} where id = ?`).get(id) as
        | { date: string; range_location: string | null }
        | undefined;
      if (!row) return;
      const next = (db.prepare(`select coalesce(max(number), 0) + 1 as n from range_sessions`).get() as { n: number }).n;
      sessionId = randomUUID();
      db.prepare(`insert into range_sessions (id, number, date, location) values (?, ?, ?, ?)`).run(
        sessionId,
        next,
        row.date,
        cleanLocation(row.range_location)
      );
    }
    const s = db.prepare(`select date, location from range_sessions where id = ?`).get(sessionId) as
      | { date: string; location: string | null }
      | undefined;
    if (!s) return;
    db.prepare(`update ${table} set session_id = ?, date = ?, range_location = ? where id = ?`).run(sessionId, s.date, s.location, id);
    pruneSessions(db);
  })();
}

export function mergeSessions(db: Database.Database, fromId: string, intoId: string) {
  if (fromId === intoId) return;
  db.transaction(() => {
    const s = db.prepare(`select date, location from range_sessions where id = ?`).get(intoId) as
      | { date: string; location: string | null }
      | undefined;
    if (!s) return;
    for (const t of ["range_log", "rounds_fired_log"] as EntryTable[]) {
      db.prepare(`update ${t} set session_id = ?, date = ?, range_location = ? where session_id = ?`).run(intoId, s.date, s.location, fromId);
    }
    const a = db.prepare(`select notes from range_sessions where id = ?`).get(fromId) as { notes: string | null } | undefined;
    if (a?.notes) {
      db.prepare(`update range_sessions set notes = trim(coalesce(notes || char(10), '') || ?) where id = ?`).run(a.notes, intoId);
    }
    db.prepare(`delete from range_sessions where id = ?`).run(fromId);
  })();
}

export function updateSession(db: Database.Database, id: string, input: { date: string; location: string | null; notes: string | null }) {
  const loc = cleanLocation(input.location);
  db.transaction(() => {
    db.prepare(`update range_sessions set date = ?, location = ?, notes = ? where id = ?`).run(input.date, loc, input.notes, id);
    for (const t of ["range_log", "rounds_fired_log"] as EntryTable[]) {
      db.prepare(`update ${t} set date = ?, range_location = ? where session_id = ?`).run(input.date, loc, id);
    }
  })();
}

export function listSessions(db: Database.Database) {
  return db
    .prepare(
      `select s.*,
         coalesce((select sum(coalesce(rounds_fired, 0)) from range_log where session_id = s.id), 0)
           + coalesce((select sum(rounds) from rounds_fired_log where session_id = s.id), 0) as rounds,
         (select group_concat(label, ' | ') from (
            select distinct firearm_label(f.make_model, f.nickname) as label from (
              select firearm_id from range_log where session_id = s.id
              union all select firearm_id from rounds_fired_log where session_id = s.id
            ) e join firearms f on f.id = e.firearm_id order by label
         )) as firearms,
         (select count(*) from range_log where session_id = s.id) as runs,
         (select count(*) from rounds_fired_log where session_id = s.id) as practice,
         (select json_group_array(json_object('id', r.id, 'name', coalesce(c.name, 'Course run'), 'score', r.final_score_percent, 'pass', r.passing_score_percent))
            from range_log r left join courses_of_fire c on c.id = r.cof_id where r.session_id = s.id) as courses_json
       from range_sessions s
       order by s.date desc, s.number desc`
    )
    .all() as SessionSummary[];
}

export function getSession(db: Database.Database, id: string) {
  return db.prepare(`select * from range_sessions where id = ?`).get(id) as RangeSession | undefined;
}

export function sessionOptions(db: Database.Database, excludeId?: string) {
  return (
    db.prepare(`select id, number, date, location from range_sessions order by date desc, number desc limit 200`).all() as Pick<
      RangeSession,
      "id" | "number" | "date" | "location"
    >[]
  ).filter((s) => s.id !== excludeId);
}
