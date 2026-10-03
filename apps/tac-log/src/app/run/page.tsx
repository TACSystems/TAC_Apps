import Link from "next/link";
import { getDb } from "@/lib/db";
import PageHeader from "@core/components/PageHeader";
import { isCombinedArms, normalizeCategories } from "@core/lib/course-categories";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  code: string | null;
  categories_json: string | null;
  total_rounds: number | null;
  last_run: string | null;
};

export default async function RunIndexPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.id, c.name, c.code, c.categories_json, c.total_rounds,
              (select max(date) from course_runs r where r.cof_id = c.id) as last_run
         from courses_of_fire c
        order by last_run desc nulls last, c.name`
    )
    .all() as Row[];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Run Course"
        icon="timer"
        subtitle="Drive a course of fire from the first beep to the last, then review what it fired before anything is recorded."
      />

      {courses.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No courses of fire yet.{" "}
          <Link href="/courses/new" className="text-brand-amber hover:text-brand-amber-light">
            Build one
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-2">
          {courses.map((c) => {
            const categories = normalizeCategories(c.categories_json);
            return (
              <Link
                key={c.id}
                href={`/run/${c.id}`}
                className="flex items-baseline justify-between gap-4 border border-neutral-700 px-4 py-3 hover:border-brand-amber"
              >
                <span>
                  <span className="font-bold">{c.name}</span>
                  {isCombinedArms(categories) ? (
                    <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-amber">Combined Arms</span>
                  ) : null}
                  <span className="block text-xs text-neutral-500">
                    {[c.code, categories.join(" · "), c.total_rounds ? `${c.total_rounds} rounds` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-widest text-neutral-500">Run →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
