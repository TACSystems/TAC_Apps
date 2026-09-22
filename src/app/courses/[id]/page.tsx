import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire, CofPhase, CofString, CofScoringZone } from "@/lib/db/types";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const course = db.prepare(`select * from courses_of_fire where id = ?`).get(id) as
    | CourseOfFire
    | undefined;

  if (!course) notFound();

  const phases = db
    .prepare(`select * from cof_phases where cof_id = ? order by phase_number`)
    .all(id) as CofPhase[];

  const strings = db
    .prepare(
      `select s.* from cof_strings s
       join cof_phases p on p.id = s.phase_id
       where p.cof_id = ?
       order by s.string_number`
    )
    .all(id) as CofString[];

  const zones = db
    .prepare(`select * from cof_scoring_zones where cof_id = ?`)
    .all(id) as CofScoringZone[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{course.name}</h1>
          <p className="text-sm text-neutral-400">
            {course.code} · {course.total_rounds} rounds · target {course.target_type}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${id}/log`}
            className="bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Log a Run
          </Link>
          <Link
            href={`/courses/${id}/group-log`}
            className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Log Group Range Day
          </Link>
        </div>
      </div>

      {phases.map((phase) => (
        <section key={phase.id}>
          <h2 className="mb-2 font-medium text-neutral-200">
            {phase.title}
            {phase.phase_total_rounds != null && (
              <span className="ml-2 text-sm text-neutral-500">
                ({phase.phase_total_rounds} rounds)
              </span>
            )}
          </h2>
          <div className="overflow-x-auto rounded border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Distance</th>
                  <th className="px-3 py-2">Weapon</th>
                  <th className="px-3 py-2">Rounds</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Position</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {strings
                  .filter((s) => s.phase_id === phase.id)
                  .map((s) => (
                    <tr key={s.id} className="border-t border-neutral-800">
                      <td className="px-3 py-2">
                        {s.string_number}
                        {s.option_label ? ` (${s.option_label})` : ""}
                      </td>
                      <td className="px-3 py-2">{s.distance}</td>
                      <td className="px-3 py-2">{s.weapon ?? "—"}</td>
                      <td className="px-3 py-2">{s.rounds ?? "—"}</td>
                      <td className="px-3 py-2">{s.time_limit ?? "—"}</td>
                      <td className="px-3 py-2">{s.position ?? "—"}</td>
                      <td className="px-3 py-2 text-neutral-300">{s.action ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Scoring Zones</h2>
        <div className="flex flex-wrap gap-3">
          {zones.map((z) => (
            <div
              key={z.id}
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              {z.zone_label}: <span className="text-neutral-400">{z.value} pts</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
