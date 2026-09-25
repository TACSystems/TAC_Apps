import Icon from "@core/components/Icon";
import PageHeader from "@core/components/PageHeader";
import Link from "next/link";
import { getDb } from "@/lib/db";
import DataTable from "@core/components/DataTable";
import { fd } from "@/lib/display";
import EmptyState from "@core/components/EmptyState";
import { listSessions, sessionNo } from "@/lib/sessions";
import SessionCourses, { parseCourses } from "@/components/SessionCourses";

export const dynamic = "force-dynamic";

export default async function RangeLogPage() {
  const db = getDb();
  const sessions = listSessions(db);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Range Log"
        icon="range"
        subtitle={
          sessions.length > 0
            ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} · ${sessions.reduce((s, x) => s + x.rounds, 0).toLocaleString()} rounds`
            : undefined
        }
        actions={
          <>
          <Link href="/checklist" className="btn btn-secondary">
            Range Bag Checklist
          </Link>
          <Link href="/timer" className="btn btn-secondary">
            Par Timer
          </Link>
          <Link href="/range-log/new" className="btn btn-primary">
            <Icon name="plus" /> Log a Range Session
          </Link>
          </>
        }
      />
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
        <DataTable
          filterPlaceholder="Filter by session #, date, location, firearm, or course…"
          noMatchMessage="No range sessions match."
          initialSort={{ key: "date", dir: "desc" }}
          columns={[
            { key: "session", label: "Session", sortable: true },
            { key: "date", label: "Date", sortable: true },
            { key: "location", label: "Location", sortable: true },
            { key: "firearms", label: "Firearms" },
            { key: "rounds", label: "Rounds", align: "right", sortable: true },
            { key: "courses", label: "Courses" },
          ]}
          rows={sessions.map((s) => {
            const courses = parseCourses(s.courses_json);
            return {
              key: s.id,
              href: `/range-log/session/${s.id}`,
              text: `${sessionNo(s.number)} ${s.number} ${s.date} ${fd(s.date)} ${s.location ?? ""} ${s.firearms ?? ""} ${courses.map((c) => c.name).join(" ")}`,
              sort: { session: s.number, date: `${s.date}-${String(s.number).padStart(6, "0")}`, location: s.location ?? "", rounds: s.rounds },
              cells: {
                session: (
                  <Link href={`/range-log/session/${s.id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {sessionNo(s.number)}
                  </Link>
                ),
                date: fd(s.date),
                location: s.location ?? <span className="text-neutral-500">—</span>,
                firearms: s.firearms ? s.firearms.split(" | ").join(", ") : "—",
                rounds: s.rounds.toLocaleString(),
                courses: <SessionCourses courses={courses} />,
              },
            };
          })}
        />
      )}
    </div>
  );
}
