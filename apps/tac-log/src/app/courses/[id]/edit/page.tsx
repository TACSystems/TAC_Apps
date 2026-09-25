import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadCourse } from "@/lib/cof";
import CourseBuilder from "@/components/CourseBuilder";
import { getDropdownOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();
  const targets = listTargetTypes(db).map((t) => ({ id: t.id, name: t.name, description: t.description, zones: t.zones }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/courses/${id}`} className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← {course.name}
        </Link>
        <h1 className="text-xl font-semibold">Edit Course of Fire</h1>
        <p className="text-sm text-neutral-400">
          Range sessions you&apos;ve already logged on this course keep the scores they were saved with.
        </p>
      </div>
      <CourseBuilder
        key={id}
        initial={{
          id: course.id,
          code: course.code,
          name: course.name,
          notes: course.notes,
          total_rounds: course.total_rounds,
          target_type_id: course.target_type_id,
          passing_score_percent: course.passing_score_percent,
          columns: course.columns,
          scorecard: course.scorecard,
          phases: course.phases,
          categories: course.categories,
        }}
        targets={targets}
        positionOptions={getDropdownOptions(db, "position")}
        categoryOptions={getDropdownOptions(db, "course_category")}
        mode="edit"
      />
    </div>
  );
}
