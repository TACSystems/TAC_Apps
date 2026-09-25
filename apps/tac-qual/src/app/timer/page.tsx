import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { parseParSeconds } from "@core/lib/par";
import ParTimer, { type TimerString } from "@core/components/ParTimer";
import { classNumberLabel, classCourses, listClasses, relays } from "@/lib/classes";
import { studentName } from "@/lib/students";

export const dynamic = "force-dynamic";

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; class?: string; relay?: string }>;
}) {
  const sp = await searchParams;
  const db = getDb();

  const klass = sp.class
    ? (db.prepare(`select * from classes where id = ?`).get(sp.class) as
        | { id: string; number: number; title: string }
        | undefined) ?? null
    : null;

  // A class narrows the course list to what that class is actually shooting.
  const courses = klass
    ? classCourses(db, klass.id).map((c) => ({ id: c.cof_id, name: c.name }))
    : (db.prepare(`select id, name from courses_of_fire order by name`).all() as { id: string; name: string }[]);

  const courseId = sp.course || null;
  const course = courseId ? loadCourse(db, courseId) : null;

  const byRelay = klass ? relays(db, klass.id) : [];
  const requested = sp.relay != null && sp.relay !== "" ? Number(sp.relay) : null;
  const activeRelay =
    requested != null && byRelay.some(([r]) => r === requested) ? requested : (byRelay[0]?.[0] ?? null);
  const lane = byRelay.find(([r]) => r === activeRelay)?.[1] ?? [];

  let strings: TimerString[] | null = null;
  if (course) {
    const labelFor = (k: string) => course.columns.find((c) => c.key === k)?.label ?? k;
    strings = course.phases.flatMap((p) =>
      p.strings
        .filter((s) => s.row_type === "string")
        .map((s) => ({
          phase: p.title,
          label: `String ${s.string_number ?? "?"}${s.option_label ? ` (${s.option_label})` : ""}${
            s.values.distance ? ` · ${s.values.distance}` : ""
          }`,
          par: parseParSeconds(s.values.time_limit),
          details: course.columns
            .filter((c) => !["distance"].includes(c.key) && s.values[c.key])
            .map((c) => `${labelFor(c.key)}: ${s.values[c.key]}`),
        }))
    );
  }

  const classes = listClasses(db).slice(0, 40);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Par Timer"
        subtitle={
          course
            ? "Running the course string by string, using each string's time limit as the par."
            : "Free timer for drills, or load a class relay and run its course."
        }
      />

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/timer">
        <label className="field min-w-56 flex-1">
          <span>Class</span>
          <select className="input" name="class" defaultValue={klass?.id ?? ""}>
            <option value="">No class — free timer</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classNumberLabel(c.number)} · {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field min-w-56 flex-1">
          <span>Course of fire</span>
          <select className="input" name="course" defaultValue={course?.id ?? ""}>
            <option value="">None</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          Load
        </button>
      </form>

      {klass && byRelay.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tracking-widest text-neutral-400">Relay</span>
          {byRelay.map(([r, members]) => (
            <Link
              key={String(r)}
              href={`/timer?class=${klass.id}&course=${course?.id ?? ""}&relay=${r ?? ""}`}
              className={`btn ${r === activeRelay ? "btn-primary" : ""}`}
            >
              {r == null ? "Unassigned" : `Relay ${r}`} ({members.length})
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ParTimer key={`${course?.id ?? "free"}-${activeRelay ?? "none"}`} strings={strings} title={course?.name} />

        {klass && lane.length > 0 && (
          <aside className="brk card h-fit p-4">
            <h2 className="text-xs tracking-widest text-neutral-400">
              {activeRelay == null ? "Unassigned" : `Relay ${activeRelay}`} on the line
            </h2>
            <ol className="mt-3 space-y-1">
              {lane.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>{studentName(s)}</span>
                  <span className="text-neutral-500">{s.lane != null ? `Lane ${s.lane}` : "—"}</span>
                </li>
              ))}
            </ol>
            {course && (
              <Link className="btn mt-4 w-full" href={`/classes/${klass.id}/score/${course.id}?relay=${activeRelay ?? ""}`}>
                Score this relay
              </Link>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
