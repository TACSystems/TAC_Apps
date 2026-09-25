import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire } from "@/lib/db/types";
import { fd } from "@/lib/display";
import CategoryTags from "@/components/CategoryTags";
import { normalizeCategories } from "@/lib/course-categories";

export const dynamic = "force-dynamic";

export default async function NewRangeSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; date?: string; location?: string }>;
}) {
  const sp = await searchParams;
  const carry = new URLSearchParams();
  if (sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)) carry.set("date", sp.date);
  if (sp.location !== undefined) carry.set("location", String(sp.location).slice(0, 200));
  const qs = carry.toString();
  const suffix = qs ? `?${qs}` : "";

  if (sp.mode !== "course") {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Log a Range Session</h1>
          <p className="text-sm text-neutral-400">
            Did you shoot a course of fire, or practice only? Everything from the same date and location joins one session,
            so you can add the other kind afterward.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href={`/range-log/new?mode=course${qs ? `&${qs}` : ""}`}
            className="flex flex-col gap-2 border border-neutral-800 bg-neutral-900 p-5 hover:border-brand-amber"
          >
            <span className="text-sm tracking-[0.15em] text-brand-amber">COURSE OF FIRE</span>
            <span className="text-sm text-neutral-300">
              Score a course target by target: zones, points, final score, PASS/FAIL, and a printable scorecard.
            </span>
          </Link>
          <Link href={`/range-day${suffix}`} className="flex flex-col gap-2 border border-neutral-800 bg-neutral-900 p-5 hover:border-brand-amber">
            <span className="text-sm tracking-[0.15em] text-brand-amber">PRACTICE ONLY</span>
            <span className="text-sm text-neutral-300">
              Log rounds for every firearm you shot, with the ammo used. Optionally type a quick score for a course.
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const db = getDb();
  const courses = db
    .prepare(
      `select c.*, (select max(date) from range_log r where r.cof_id = c.id) as last_run
       from courses_of_fire c order by last_run is null, last_run desc, c.name`
    )
    .all() as (CourseOfFire & { last_run: string | null })[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/range-log/new${suffix}`} className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Course of fire or practice
        </Link>
        <h1 className="text-xl font-semibold">Pick the Course of Fire</h1>
        <p className="text-sm text-neutral-400">
          {sp.date ? `Adding to the session on ${fd(sp.date)}${sp.location ? ` at ${sp.location}` : ""}. ` : ""}
          Practicing too?{" "}
          <Link href={`/range-day${suffix}`} className="text-brand-amber hover:text-brand-amber-light">
            Log practice
          </Link>{" "}
          for the same date and location and it joins this session.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.id}/log${suffix}`}
            className="border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-neutral-400">
              {c.code}
              {c.total_rounds != null ? ` · ${c.total_rounds} rounds` : ""}
              {c.target_type ? ` · ${c.target_type}` : ""}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <CategoryTags categories={normalizeCategories(c.categories_json)} empty={null} />
              {c.last_run ? `Last shot ${fd(c.last_run)}` : "Not shot yet"}
            </div>
          </Link>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-neutral-500">
            No courses of fire yet.{" "}
            <Link href="/courses/new" className="text-brand-amber hover:text-brand-amber-light">
              Build one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
