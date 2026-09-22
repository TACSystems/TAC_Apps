import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire, CofScoringZone, Firearm, Participant } from "@/lib/db/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { submitGroupRangeLog } from "./actions";
import GroupScoringForm from "@/components/GroupScoringForm";

export default async function GroupLogRunPage({ params }: { params: Promise<{ id: string }> }) {
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

  const participants = db
    .prepare(`select * from participants where status = 'active' order by name`)
    .all() as Participant[];

  const action = submitGroupRangeLog.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Log Group Range Day</h1>
          <p className="text-sm text-neutral-400">{course.name}</p>
        </div>
        <a
          href={`/courses/${id}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Print Blank Scorecard
        </a>
      </div>
      {participants.length === 0 && (
        <p className="mb-4 text-sm text-neutral-500">
          No participants yet —{" "}
          <Link href="/participants/new" className="text-blue-400 hover:text-blue-300">
            add one first
          </Link>
          .
        </p>
      )}
      <GroupScoringForm
        zones={zones}
        firearms={firearms}
        participants={participants}
        totalRounds={course.total_rounds}
        action={action}
      />
    </div>
  );
}
