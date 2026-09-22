import { getDb } from "@/lib/db";
import type { CourseOfFire, RangeLog } from "@/lib/db/types";
import CourseSelect from "@/components/CourseSelect";
import ScoreTrendChart, { type ChartSeries } from "@/components/ScoreTrendChart";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ cof?: string }>;
}) {
  const { cof } = await searchParams;
  const db = getDb();

  const courses = db.prepare(`select * from courses_of_fire order by name`).all() as CourseOfFire[];

  if (courses.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Stats</h1>
        <p className="text-sm text-neutral-500">No courses of fire loaded yet.</p>
      </div>
    );
  }

  const selectedId = cof && courses.some((c) => c.id === cof) ? cof : courses[0].id;
  const selectedCourse = courses.find((c) => c.id === selectedId)!;

  const logs = db
    .prepare(
      `select rl.*, coalesce(f.make_model, 'Unlinked firearm') as firearm_name
       from range_log rl
       left join firearms f on f.id = rl.firearm_id
       where rl.cof_id = ? and rl.final_score_percent is not null
       order by rl.date asc`
    )
    .all(selectedId) as (RangeLog & { firearm_name: string })[];

  const byFirearm = new Map<string, ChartSeries>();
  for (const log of logs) {
    if (!byFirearm.has(log.firearm_name)) {
      byFirearm.set(log.firearm_name, { name: log.firearm_name, points: [] });
    }
    byFirearm.get(log.firearm_name)!.points.push({
      date: log.date,
      score: log.final_score_percent as number,
    });
  }
  const series = Array.from(byFirearm.values()).sort((a, b) => a.name.localeCompare(b.name));

  const personalBest = logs.reduce(
    (best, l) => (l.final_score_percent != null && l.final_score_percent > best ? l.final_score_percent : best),
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stats</h1>
        <CourseSelect courses={courses} selectedId={selectedId} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">{selectedCourse.name} — score over time, by firearm</p>
        {logs.length > 0 && (
          <p className="text-sm text-neutral-400">
            Personal Best: <span className="text-neutral-100">{personalBest}%</span>
          </p>
        )}
      </div>

      <ScoreTrendChart series={series} />

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Firearm</th>
              <th className="px-3 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-neutral-800">
                <td className="px-3 py-2">{l.date}</td>
                <td className="px-3 py-2">{l.firearm_name}</td>
                <td className="px-3 py-2">{l.final_score_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-neutral-500">
            No scored range sessions yet for this course.
          </p>
        )}
      </div>
    </div>
  );
}
