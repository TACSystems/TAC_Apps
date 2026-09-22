import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.*, (select count(*) from range_log r where r.cof_id = c.id) as run_count
       from courses_of_fire c order by c.name`
    )
    .all() as (CourseOfFire & { run_count: number })[];

  const btn = "border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Courses of Fire</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/courses/new" className="bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
            Build New Course
          </Link>
          <Link href="/targets" className={btn}>
            Target Types
          </Link>
          <Link href="/courses/updates" className={btn}>
            Import
          </Link>
          {courses.length > 0 && (
            <a href="/api/courses/export" className={btn}>
              Export All
            </a>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <div key={c.id} className="flex flex-col border border-neutral-800 bg-neutral-900 hover:border-neutral-600">
            <Link href={`/courses/${c.id}`} className="flex-1 p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-neutral-400">
                {c.code}
                {c.total_rounds != null ? ` · ${c.total_rounds} rounds` : ""}
                {c.target_type ? ` · ${c.target_type}` : ""}
                {c.passing_score_percent != null ? ` · pass ${c.passing_score_percent}%` : ""}
              </div>
              <div className="text-xs text-neutral-500">
                {c.run_count} run{c.run_count === 1 ? "" : "s"} logged
              </div>
            </Link>
            <div className="flex gap-4 border-t border-neutral-800 px-4 py-2 text-xs">
              <Link href={`/courses/${c.id}/log`} className="text-blue-400 hover:text-blue-300">
                Log a Run
              </Link>
              <Link href={`/courses/${c.id}/print`} className="text-blue-400 hover:text-blue-300">
                Print
              </Link>
              <Link href={`/courses/${c.id}/edit`} className="text-blue-400 hover:text-blue-300">
                Edit
              </Link>
              <Link href={`/courses/new?from=${c.id}`} className="text-blue-400 hover:text-blue-300">
                Duplicate
              </Link>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-neutral-500">
            No courses of fire yet. Build one, or import a course file.
          </p>
        )}
      </div>
    </div>
  );
}
