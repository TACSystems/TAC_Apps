import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadCourse } from "@core/lib/cof";
import CourseBuilder from "@/components/CourseBuilder";
import { listOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();
  const targets = listTargetTypes(db).map((t) => ({ id: t.id, name: t.name, description: t.description, zones: t.zones }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Course of Fire"
        subtitle="Runs already scored on this course keep the scores they were saved with."
        back={{ href: `/courses/${id}`, label: course.name }}
      />
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
        positionOptions={listOptions(db, "position")}
        categoryOptions={listOptions(db, "course_category")}
        mode="edit"
      />
    </div>
  );
}
