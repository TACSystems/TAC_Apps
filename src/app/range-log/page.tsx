import Link from "next/link";
import { getDb } from "@/lib/db";
import SearchBox from "@/components/SearchBox";
import { fd } from "@/lib/display";
import ClickRow from "@/components/ClickRow";
import EmptyState from "@/components/EmptyState";
import { listSessions, sessionNo } from "@/lib/sessions";
import SessionCourses, { parseCourses } from "@/components/SessionCourses";

export const dynamic = "force-dynamic";

export default async function RangeLogPage() {
  const db = getDb();
  const sessions = listSessions(db);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Range Log</h1>
          {sessions.length > 0 && (
            <p className="text-sm text-neutral-400">
              {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
              {sessions.reduce((s, x) => s + x.rounds, 0).toLocaleString()} rounds
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/checklist" className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
            Range Bag Checklist
          </Link>
          <Link href="/timer" className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
            Par Timer
          </Link>
          <Link href="/range-log/new" className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Log a Range Session
          </Link>
        </div>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title="No range sessions yet"
          actions={[
            { href: "/range-log/new", label: "Log a Range Session", primary: true },
            { href: "/courses", label: "Browse Courses of Fire" },
          ]}
        >
          A session is one trip to the range. Score courses of fire and log practice rounds; everything from the same date and
          location lands in the same session.
        </EmptyState>
      ) : (
        <SearchBox
          placeholder="Search by session #, date, location, firearm, or course…"
          emptyMessage="No range sessions found."
          head={
            <tr>
              <th className="px-3 py-2">Session</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Firearms</th>
              <th className="px-3 py-2 text-right">Rounds</th>
              <th className="px-3 py-2">Courses</th>
            </tr>
          }
          rows={sessions.map((s) => {
            const courses = parseCourses(s.courses_json);
            return {
              key: s.id,
              text: `${sessionNo(s.number)} ${s.number} ${s.date} ${fd(s.date)} ${s.location ?? ""} ${s.firearms ?? ""} ${courses.map((c) => c.name).join(" ")}`,
              row: (
                <ClickRow key={s.id} href={`/range-log/session/${s.id}`} className="border-t border-neutral-800 align-top hover:bg-neutral-900">
                  <td className="px-3 py-2">
                    <Link href={`/range-log/session/${s.id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {sessionNo(s.number)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{fd(s.date)}</td>
                  <td className="px-3 py-2">{s.location ?? <span className="text-neutral-500">—</span>}</td>
                  <td className="px-3 py-2">{s.firearms ? s.firearms.split(" | ").join(", ") : "—"}</td>
                  <td className="px-3 py-2 text-right">{s.rounds.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <SessionCourses courses={courses} />
                  </td>
                </ClickRow>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
