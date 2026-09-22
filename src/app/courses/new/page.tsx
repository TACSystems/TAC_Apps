import Link from "next/link";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadCourse, type CourseDef } from "@/lib/cof";
import CourseBuilder from "@/components/CourseBuilder";
import { getDropdownOptions } from "@/lib/db/dropdown-options";

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
      };
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/courses" className="text-xs text-blue-400 hover:text-blue-300">
          ← Courses of Fire
        </Link>
        <h1 className="text-xl font-semibold">Course of Fire Builder</h1>
        {sourceName && <p className="text-sm text-neutral-400">Starting from a copy of {sourceName}.</p>}
      </div>
      <CourseBuilder initial={initial} targets={targets}
        positionOptions={getDropdownOptions(db, "position")} mode="new" />
    </div>
  );
}
