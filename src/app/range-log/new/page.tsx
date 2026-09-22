import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire, Firearm } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function NewRangeSessionPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.*, (select max(date) from range_log r where r.cof_id = c.id) as last_run
       from courses_of_fire c order by last_run is null, last_run desc, c.name`
    )
    .all() as (CourseOfFire & { last_run: string | null })[];
  const firearms = db
    .prepare(`select id, make_model from firearms where status = 'active' order by make_model`)
    .all() as Pick<Firearm, "id" | "make_model">[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Log a Range Session</h1>
        <p className="text-sm text-neutral-400">Pick the course of fire you shot.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.id}/log`}
            className="border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-neutral-400">
              {c.code}
              {c.total_rounds != null ? ` · ${c.total_rounds} rounds` : ""}
              {c.target_type ? ` · ${c.target_type}` : ""}
            </div>
            <div className="text-xs text-neutral-500">{c.last_run ? `Last shot ${c.last_run}` : "Not shot yet"}</div>
          </Link>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-neutral-500">
            No courses of fire yet.{" "}
            <Link href="/courses/new" className="text-blue-400 hover:text-blue-300">
              Build one
            </Link>
            .
          </p>
        )}
      </div>

      <section className="border-t border-neutral-800 pt-4">
        <h2 className="mb-1 font-medium text-neutral-200">Not shooting a course?</h2>
        <p className="mb-2 text-sm text-neutral-400">
          Record practice or plinking rounds with Update Rounds Fired on the firearm you used:
        </p>
        <div className="flex flex-wrap gap-2">
          {firearms.map((f) => (
            <Link
              key={f.id}
              href={`/inventory/${f.id}#rounds-fired`}
              className="border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              {f.make_model}
            </Link>
          ))}
          {firearms.length === 0 && <span className="text-sm text-neutral-500">No active firearms in the armory.</span>}
        </div>
      </section>
    </div>
  );
}
