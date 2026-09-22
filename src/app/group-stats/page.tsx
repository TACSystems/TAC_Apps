import { getDb } from "@/lib/db";
import type { CourseOfFire, GroupRangeLog } from "@/lib/db/types";
import CourseSelect from "@/components/CourseSelect";
import ScoreTrendChart, { type ChartSeries } from "@/components/ScoreTrendChart";

export const dynamic = "force-dynamic";

export default async function GroupStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ cof?: string; participant?: string }>;
}) {
  const { cof, participant: participantId } = await searchParams;
  const db = getDb();

  const courses = db.prepare(`select * from courses_of_fire order by name`).all() as CourseOfFire[];

  if (courses.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Group Stats</h1>
        <p className="text-sm text-neutral-500">No courses of fire loaded yet.</p>
      </div>
    );
  }

  const selectedId = cof && courses.some((c) => c.id === cof) ? cof : courses[0].id;
  const selectedCourse = courses.find((c) => c.id === selectedId)!;

  const participantFilter = participantId
    ? (db.prepare(`select name from participants where id = ?`).get(participantId) as
        | { name: string }
        | undefined)
    : undefined;

  const logs = (
    participantFilter
      ? db
          .prepare(
            `select grl.*, p.name as participant_name
             from group_range_log grl
             join participants p on p.id = grl.participant_id
             where grl.cof_id = ? and grl.final_score_percent is not null and grl.participant_id = ?
             order by grl.date asc`
          )
          .all(selectedId, participantId)
      : db
          .prepare(
            `select grl.*, p.name as participant_name
             from group_range_log grl
             join participants p on p.id = grl.participant_id
             where grl.cof_id = ? and grl.final_score_percent is not null
             order by grl.date asc`
          )
          .all(selectedId)
  ) as (GroupRangeLog & { participant_name: string })[];

  const byParticipant = new Map<string, ChartSeries>();
  for (const log of logs) {
    if (!byParticipant.has(log.participant_name)) {
      byParticipant.set(log.participant_name, { name: log.participant_name, points: [] });
    }
    byParticipant.get(log.participant_name)!.points.push({
      date: log.date,
      score: log.final_score_percent as number,
    });
  }
  const series = Array.from(byParticipant.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Group Stats</h1>
        <CourseSelect courses={courses} selectedId={selectedId} basePath="/group-stats" />
      </div>
      <p className="text-sm text-neutral-400">
        {selectedCourse.name} — score over time, by participant
      </p>

      <ScoreTrendChart series={series} />

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Participant</th>
              <th className="px-3 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-neutral-800">
                <td className="px-3 py-2">{l.date}</td>
                <td className="px-3 py-2">{l.participant_name}</td>
                <td className="px-3 py-2">{l.final_score_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-neutral-500">
            No scored group runs yet for this course.
          </p>
        )}
      </div>
    </div>
  );
}
