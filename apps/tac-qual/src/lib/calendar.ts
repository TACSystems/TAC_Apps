import type Database from "better-sqlite3-multiple-ciphers";

export type CalendarEntry = {
  class_id: string;
  number: number;
  title: string;
  class_type: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  day_number: number;
  day_count: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The five weeks that contain the next 30 days, starting on the Sunday of the
 * current week — a rolling window rather than a calendar month, so "the next
 * month" never means "four days, because it is the 27th".
 */
export function calendarWindow(todayISO: string, weeks = 5) {
  const today = new Date(`${todayISO}T00:00:00Z`);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days: string[] = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(iso(d));
  }
  return { start: days[0], end: days[days.length - 1], days };
}

/** Every class day falling inside the window, one entry per day of a class. */
export function calendarEntries(db: Database.Database, from: string, to: string) {
  return db
    .prepare(
      `select d.class_id, d.date, d.start_time, d.end_time, d.day_number,
              c.number, c.title, c.class_type,
              (select count(*) from class_days x where x.class_id = d.class_id) as day_count
         from class_days d
         join classes c on c.id = d.class_id
        where d.date between ? and ?
        order by d.date, coalesce(d.start_time, '99:99'), c.number`
    )
    .all(from, to) as CalendarEntry[];
}

export function groupByDate(entries: CalendarEntry[]) {
  const map = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}
