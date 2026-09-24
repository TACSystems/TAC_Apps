import Link from "next/link";
import { getDb } from "@/lib/db";
import { loadCourse } from "@/lib/cof";
import { parseParSeconds } from "@/lib/par";
import ParTimer, { type TimerString } from "@/components/ParTimer";

export const dynamic = "force-dynamic";

export default async function TimerPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course: courseId } = await searchParams;
  const db = getDb();
  const course = courseId ? loadCourse(db, courseId) : null;
  const courses = db.prepare(`select id, name from courses_of_fire order by name`).all() as { id: string; name: string }[];

  let strings: TimerString[] | null = null;
  if (course) {
    const labelFor = (k: string) => course.columns.find((c) => c.key === k)?.label ?? k;
    strings = course.phases.flatMap((p) =>
      p.strings
        .filter((s) => s.row_type === "string")
        .map((s) => ({
          phase: p.title,
          label: `String ${s.string_number ?? "?"}${s.option_label ? ` (${s.option_label})` : ""}${s.values.distance ? ` · ${s.values.distance}` : ""}`,
          par: parseParSeconds(s.values.time_limit),
          details: course.columns
            .filter((c) => !["distance"].includes(c.key) && s.values[c.key])
            .map((c) => `${labelFor(c.key)}: ${s.values[c.key]}`),
        }))
    );
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Par Timer</h1>
          <p className="text-sm text-neutral-400">
            {course ? (
              <>
                Running{" "}
                <Link href={`/courses/${course.id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {course.name}
                </Link>{" "}
                string by string, using each string&apos;s time limit as the par.
              </>
            ) : (
              "Free timer for dry fire and drills, or pick a course to run string by string."
            )}
          </p>
        </div>
        <form className="flex items-center gap-2" action="/timer">
          <select name="course" defaultValue={course?.id ?? ""} className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm">
            <option value="">Free timer</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700">
            Load
          </button>
        </form>
      </div>
      <ParTimer key={course?.id ?? "free"} strings={strings} title={course?.name} />
    </div>
  );
}
