import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadCourse, type CourseDef } from "@core/lib/cof";
import CourseBuilder from "@/components/CourseBuilder";
import { listOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const db = getDb();
  const targets = listTargetTypes(db).map((t) => ({ id: t.id, name: t.name, description: t.description, zones: t.zones }));

  let initial: CourseDef | null = null;
  let sourceName: string | null = null;
  if (from) {
    const src = loadCourse(db, from);
    if (src) {
      sourceName = src.name;
      let code = `${src.code}-COPY`;
      let i = 2;
      while (db.prepare(`select 1 from courses_of_fire where code = ?`).get(code)) code = `${src.code}-COPY${i++}`;
      initial = {
        code,
        name: `${src.name} (Copy)`,
        notes: src.notes,
        total_rounds: src.total_rounds,
        target_type_id: src.target_type_id,
        passing_score_percent: src.passing_score_percent,
        columns: src.columns,
        scorecard: src.scorecard,
        phases: src.phases,
        categories: src.categories,
      };
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course of Fire Builder"
        subtitle={sourceName ? `Starting from a copy of ${sourceName}.` : "Phases, strings, columns and the printed scorecard."}
        back={{ href: "/courses", label: "Courses of Fire" }}
      />
      <CourseBuilder
        initial={initial}
        targets={targets}
        positionOptions={listOptions(db, "position")}
        categoryOptions={listOptions(db, "course_category")}
        mode="new"
      />
    </div>
  );
}
