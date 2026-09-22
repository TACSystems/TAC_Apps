import { getDb } from "@/lib/db";
import type { CourseOfFire, CofScoringZone, Firearm } from "@/lib/db/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { submitRangeLog } from "./actions";
import ScoringForm from "@/components/ScoringForm";

export default async function LogRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const course = db.prepare(`select * from courses_of_fire where id = ?`).get(id) as
    | CourseOfFire
    | undefined;
  if (!course) notFound();

  const zones = db
    .prepare(`select * from cof_scoring_zones where cof_id = ?`)
    .all(id) as CofScoringZone[];

  const firearms = db
    .prepare(`select * from firearms where status = 'active' order by make_model`)
    .all() as Firearm[];

  const action = submitRangeLog.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Log a Run</h1>
          <p className="text-sm text-neutral-400">{course.name}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/courses/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Print Blank Scorecard
          </a>
          <a
            href={`/courses/${id}/group-log`}
            className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Log Group Range Day
          </a>
        </div>
      </div>
      <ScoringForm zones={zones} firearms={firearms} totalRounds={course.total_rounds} action={action} />
    </div>
  );
}
