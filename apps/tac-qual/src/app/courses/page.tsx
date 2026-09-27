import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import CourseList from "@core/components/CourseList";
import EmptyState from "@core/components/EmptyState";
import { normalizeCategories } from "@core/lib/course-categories";
import { getDb } from "@/lib/db";
import { listOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.id, c.code, c.name, c.total_rounds, c.passing_score_percent, c.categories_json,
              t.name as target_name,
              (select count(*) from score_runs r where r.cof_id = c.id) as runs
         from courses_of_fire c
         left join target_types t on t.id = c.target_type_id
        order by c.name`
    )
    .all() as {
    id: string;
    code: string;
    name: string;
    total_rounds: number | null;
    passing_score_percent: number | null;
    categories_json: string | null;
    target_name: string | null;
    runs: number;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses of Fire"
        icon="course"
        subtitle={`${courses.length} course${courses.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/courses/new">
              + Build New Course
            </Link>
            <Link className="btn" href="/targets">
              Target Types
            </Link>
          </div>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          title="No courses of fire"
          actions={[{ href: "/courses/new", label: "Build a course", primary: true }]}
        >
          Build one here, or import a course file exported from TAC-LOG.
        </EmptyState>
      ) : (
        <CourseList
          categories={listOptions(db, "course_category")}
            searchPlaceholder="Search courses by name, code, or category…"
          courses={courses.map((c) => ({
            id: c.id,
            href: `/courses/${c.id}`,
            name: c.name,
            code: c.code,
            footer: `${c.runs} run${c.runs === 1 ? "" : "s"} scored`,
            categories: normalizeCategories(c.categories_json),
            meta: [
              c.code,
              c.total_rounds != null ? `${c.total_rounds} rounds` : null,
              c.target_name,
              c.passing_score_percent != null ? `pass ${c.passing_score_percent}%` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            // No Print here: TAC-QUAL prints blank scorecards for a whole
            // class, not for a course on its own, so there is no such route.
            links: [
              { label: "Edit", href: `/courses/${c.id}/edit` },
              { label: "Duplicate", href: `/courses/new?from=${c.id}` },
            ],
          }))}
        />
      )}
    </div>
  );
}
