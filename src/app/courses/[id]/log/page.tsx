import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse, maxPointsFor } from "@/lib/cof";
import type { Firearm } from "@/lib/db/types";
import ScoringForm from "@/components/ScoringForm";
import { submitRangeLog } from "./actions";

export const dynamic = "force-dynamic";

export default async function LogRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const firearms = db
    .prepare(`select * from firearms where status = 'active' order by make_model`)
    .all() as Firearm[];

  const fields = [...course.scorecard.header, ...course.scorecard.signoff].filter(
    (f) => !f.printOnly && f.key !== "date"
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`/courses/${id}`} className="text-xs text-blue-400 hover:text-blue-300">
            ← {course.name}
          </Link>
          <h1 className="text-xl font-semibold">Log a Run</h1>
          <p className="text-sm text-neutral-400">
            {course.effective_total_rounds} rounds
            {course.target ? ` · ${course.target.name}` : ""}
            {course.passing_score_percent != null ? ` · passing ${course.passing_score_percent}%` : ""}
          </p>
        </div>
        <Link
          href={`/courses/${id}/print?view=card`}
          className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Print Blank Scorecard
        </Link>
      </div>
      {course.target ? (
        <ScoringForm
          zones={course.target.zones}
          fields={fields}
          firearms={firearms}
          totalRounds={course.effective_total_rounds}
          maxPoints={maxPointsFor(course.effective_total_rounds, course.target.zones)}
          passing={course.passing_score_percent}
          action={submitRangeLog.bind(null, id)}
        />
      ) : (
        <p className="text-sm text-neutral-400">
          This course has no target type, so there&apos;s nothing to score against.{" "}
          <Link href={`/courses/${id}/edit`} className="text-blue-400 hover:text-blue-300">
            Pick one in the editor
          </Link>
          .
        </p>
      )}
    </div>
  );
}
