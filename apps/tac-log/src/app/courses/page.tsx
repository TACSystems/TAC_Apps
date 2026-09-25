import Icon from "@core/components/Icon";
import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire } from "@/lib/db/types";
import CourseList from "@/components/CourseList";
import CategorizeBanner from "@/components/CategorizeBanner";
import { normalizeCategories } from "@core/lib/course-categories";
import { categorizePromptVisible, courseCategoryOptions } from "@/lib/course-category-store";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.*, (select count(*) from range_log r where r.cof_id = c.id) as run_count
       from courses_of_fire c order by c.name`
    )
    .all() as (CourseOfFire & { run_count: number })[];

  const btn = "btn btn-secondary";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="course" size={20} className="text-brand-amber" />
          Courses of Fire
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/courses/new" className="btn btn-primary">
            <Icon name="plus" /> Build New Course
          </Link>
          <Link href="/targets" className={btn}>
            Target Types
          </Link>
        </div>
      </div>
      <CategorizeBanner count={categorizePromptVisible(db)} />
      <CourseList
        categories={courseCategoryOptions(db)}
        courses={courses.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          runs: c.run_count,
          categories: normalizeCategories(c.categories_json),
          meta: [
            c.code,
            c.total_rounds != null ? `${c.total_rounds} rounds` : null,
            c.target_type,
            c.passing_score_percent != null ? `pass ${c.passing_score_percent}%` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
    </div>
  );
}
