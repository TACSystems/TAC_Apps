import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { classDays, classInstructors, classNumberLabel, getClass, relays, type ClassDay } from "@/lib/classes";
import { studentName } from "@/lib/students";
import { fd } from "@/lib/display";
import PrintSheet from "@/components/PrintSheet";

export const dynamic = "force-dynamic";

/** Three signature columns fit a page; a longer class prints another sheet. */
const DAYS_PER_SHEET = 3;

function chunk<T>(list: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function dayHeading(d: ClassDay) {
  const times = [d.start_time, d.end_time].filter(Boolean).join("–");
  return { date: fd(d.date), times };
}

export default async function RosterPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();
  const byRelay = relays(db, id);
  const instructors = classInstructors(db, id);

  // A class from before multi-day support has no rows; its own date is day one.
  const days = classDays(db, id);
  const allDays: ClassDay[] = days.length
    ? days
    : [{ id: "d1", class_id: id, day_number: 1, date: klass.date, start_time: null, end_time: null }];
  const sheets = chunk(allDays, DAYS_PER_SHEET);
  const single = allDays.length === 1;

  return (
    <PrintSheet
      title="Class Roster & Sign-In"
      subtitle={`${classNumberLabel(klass.number)} · ${fd(klass.date)}`}
      backHref={`/classes/${id}`}
      backLabel={klass.title}
    >
      {sheets.map((sheetDays, sheetIndex) => (
        <div key={sheetIndex} className={sheetIndex < sheets.length - 1 ? "page-break space-y-4" : "space-y-4"}>
          <div className="space-y-1 text-sm">
            <div>
              <strong>{klass.title}</strong>
              {sheets.length > 1 && (
                <span className="ml-2 text-xs">
                  Sheet {sheetIndex + 1} of {sheets.length}
                </span>
              )}
            </div>
            {klass.location && <div>Location: {klass.location}</div>}
            {instructors.length > 0 && <div>Instructors: {instructors.map((i) => i.name).join(", ")}</div>}
            <div>
              {sheetDays
                .map((d) => {
                  const h = dayHeading(d);
                  return `Day ${d.day_number}: ${h.date}${h.times ? ` ${h.times}` : ""}`;
                })
                .join("  ·  ")}
            </div>
          </div>

          {byRelay.map(([relay, rows]) => (
            <section key={String(relay)} className="space-y-2">
              <h2 className="text-xs tracking-widest">{relay == null ? "UNASSIGNED" : `RELAY ${relay}`}</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-16">Lane</th>
                    <th>Student</th>
                    {/* The firearm column only fits while there is one day to
                        sign for; past that the signatures need the width. */}
                    {single && <th>Firearm</th>}
                    {sheetDays.map((d) => {
                      const h = dayHeading(d);
                      return (
                        <th key={d.id} className={single ? "w-64" : "w-44"}>
                          Day {d.day_number}
                          <span className="block text-[10px] font-normal">
                            {h.date}
                            {h.times ? ` · ${h.times}` : ""}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.lane ?? ""}</td>
                      <td>{studentName(r)}</td>
                      {single && <td />}
                      {sheetDays.map((d) => (
                        <td key={d.id}>
                          <span className="sign-line">&nbsp;</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      ))}
    </PrintSheet>
  );
}
