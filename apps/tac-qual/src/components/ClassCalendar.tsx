import Link from "next/link";
import { calendarEntries, calendarWindow, groupByDate, type CalendarEntry } from "@/lib/calendar";
import { getDb } from "@/lib/db";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "a" : "p";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

function Entry({ e }: { e: CalendarEntry }) {
  const time = shortTime(e.start_time);
  return (
    <Link
      href={`/classes/${e.class_id}`}
      title={`${e.title}${e.class_type ? ` · ${e.class_type}` : ""}${
        e.day_count > 1 ? ` · day ${e.day_number} of ${e.day_count}` : ""
      }${e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}`}
      className="block truncate border-l-2 border-brand-amber bg-neutral-800 px-1 py-0.5 text-[11px] normal-case leading-tight text-neutral-200 hover:bg-neutral-700"
    >
      {time && <span className="num mr-1 text-neutral-400">{time}</span>}
      {e.title}
      {e.day_count > 1 && <span className="text-neutral-500"> ({e.day_number}/{e.day_count})</span>}
    </Link>
  );
}

export default function ClassCalendar({ today, weeks = 5 }: { today: string; weeks?: number }) {
  const db = getDb();
  const { start, end, days } = calendarWindow(today, weeks);
  const byDate = groupByDate(calendarEntries(db, start, end));
  const grid: string[][] = [];
  for (let i = 0; i < days.length; i += 7) grid.push(days.slice(i, i + 7));

  return (
    <section className="card p-4" data-section="calendar">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm tracking-widest text-neutral-400">Next {weeks} weeks</h2>
        <Link href="/classes" className="text-xs text-brand-amber hover:text-brand-amber-light">
          All classes
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px border border-neutral-800 bg-neutral-800 text-xs">
        {DOW.map((d) => (
          <div key={d} className="bg-neutral-900 px-1 py-1 text-center text-[10px] tracking-widest text-neutral-500">
            {d}
          </div>
        ))}
        {grid.flatMap((week) =>
          week.map((date) => {
            const entries = byDate.get(date) ?? [];
            const isToday = date === today;
            const dayNum = Number(date.slice(8, 10));
            // A rolling window crosses a month boundary by design, so dimming
            // "another month" would wash out most of the grid. The month is
            // named on its first day instead.
            const label =
              dayNum === 1
                ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) + " 1"
                : String(dayNum);
            return (
              <div
                key={date}
                className={`min-h-20 bg-neutral-900 p-1 ${isToday ? "outline outline-1 outline-brand-amber" : ""}`}
              >
                <div className={`num mb-1 text-[10px] ${isToday ? "text-brand-amber" : "text-neutral-500"}`}>
                  {label}
                </div>
                <div className="flex flex-col gap-0.5">
                  {entries.map((e) => (
                    <Entry key={`${e.class_id}-${e.day_number}`} e={e} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-2 text-[11px] normal-case text-neutral-500">
        Each entry is one day of a class. Hover for the type and hours; a multi-day class shows which day it is.
      </p>
    </section>
  );
}
