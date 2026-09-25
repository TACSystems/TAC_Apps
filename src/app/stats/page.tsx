import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire, RangeLog } from "@/lib/db/types";
import CourseSelect from "@/components/CourseSelect";
import { dateFormat, fd } from "@/lib/display";
import ScoreTrendChart, { type ChartSeries } from "@/components/ScoreTrendChart";
import BarList from "@/components/BarList";
import { caliberCosts, categoryStats, courseStats, firearmStats, overview, roundsByMonth, zoneDistribution } from "@/lib/stats";
import { getSettings, money } from "@/lib/settings";
import EmptyState from "@/components/EmptyState";

import Collapsible from "@/components/Collapsible";
import SectionTools from "@/components/SectionTools";
import { pageSections } from "@/lib/page-sections";

export const dynamic = "force-dynamic";

const th = "px-3 py-2";
const td = "border-t border-neutral-800 px-3 py-2";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-neutral-800 bg-neutral-900 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ cof?: string }> }) {
  const { cof } = await searchParams;
  const db = getDb();
  const cur = getSettings(db).currencySymbol;
  const ov = overview(db);
  const months = roundsByMonth(db, 12);
  const byCourse = courseStats(db);
  const byCategory = categoryStats(db);
  const byFirearm = firearmStats(db);
  const costs = caliberCosts(db);

  const courses = db.prepare(`select * from courses_of_fire order by name`).all() as CourseOfFire[];
  const shotCourses = byCourse.filter((c) => c.sessions > 0);
  const defaultId = shotCourses[0]?.id ?? courses[0]?.id;
  const selectedId = cof && courses.some((c) => c.id === cof) ? cof : defaultId;
  const selectedCourse = courses.find((c) => c.id === selectedId);

  const logs = selectedId
    ? (db
        .prepare(
          `select rl.*, coalesce(firearm_label(f.make_model, f.nickname), 'Unlinked firearm') as firearm_name
           from range_log rl left join firearms f on f.id = rl.firearm_id
           where rl.cof_id = ? and rl.final_score_percent is not null order by rl.date asc`
        )
        .all(selectedId) as (RangeLog & { firearm_name: string })[])
    : [];

  const seriesMap = new Map<string, ChartSeries>();
  for (const log of logs) {
    if (!seriesMap.has(log.firearm_name)) seriesMap.set(log.firearm_name, { name: log.firearm_name, points: [] });
    seriesMap.get(log.firearm_name)!.points.push({ date: log.date, score: log.final_score_percent as number });
  }
  const series = Array.from(seriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const personalBest = logs.reduce((b, l) => Math.max(b, l.final_score_percent ?? 0), 0);
  const zones = selectedId ? zoneDistribution(db, selectedId) : [];
  const zoneTotal = zones.reduce((s, z) => s + z.counted, 0);
  const open = pageSections(db, "stats");
  const sessionCount = (db.prepare(`select count(*) as n from range_sessions`).get() as { n: number }).n;
  const totalAmmoSpend = costs.reduce((s, c) => s + (c.fired_cost ?? 0), 0);

  return (
    <div data-scope="stats" className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Stats</h1>
      {ov.sessions === 0 && ov.totalRounds === 0 && (
        <EmptyState
          title="Nothing to chart yet"
          actions={[
            { href: "/range-log/new", label: "Log a Range Session", primary: true },
            { href: "/inventory", label: "Go to Armory" },
          ]}
        >
          Stats fill in as you log range sessions, rounds fired, and ammo purchases: score trends, pass rates by course and
          category, rounds per month, and cost per round.
        </EmptyState>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Range sessions" value={sessionCount.toLocaleString()} sub={`${ov.sessions.toLocaleString()} course runs`} />
        <Tile label="Rounds fired (all time)" value={ov.totalRounds.toLocaleString()} />
        <Tile label={`Rounds fired ${new Date().getFullYear()}`} value={ov.roundsThisYear.toLocaleString()} />
        <Tile label="Average score" value={ov.avgScore != null ? `${ov.avgScore}%` : "—"} />
        <Tile
          label="Pass rate"
          value={ov.graded ? `${Math.round((ov.passed / ov.graded) * 100)}%` : "—"}
          sub={ov.graded ? `${ov.passed} of ${ov.graded} graded runs` : "No graded runs yet"}
        />
      </section>

      <SectionTools scope="stats" remember />

      <Collapsible id="months" scope="stats" title="Rounds Fired per Month" defaultOpen={open("months", true)}>
        <p className="mb-2 text-xs text-neutral-500">Range sessions plus Update Rounds Fired entries, last 12 months.</p>
        <BarList
          rows={months.map((m) => ({ label: m.month, value: m.rounds }))}
          unit="rounds"
          emptyText="No rounds recorded in the last 12 months."
        />
      </Collapsible>

      <Collapsible id="course-detail" scope="stats" title="Course Detail" defaultOpen={open("course-detail", true)} summary={selectedCourse?.name}>
        <div className="flex flex-col gap-3">
        {courses.length > 0 && selectedId && (
          <div className="flex justify-end">
            <CourseSelect courses={courses} selectedId={selectedId} />
          </div>
        )}
        {selectedCourse ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-400">
              <span>{selectedCourse.name}: score over time, by firearm</span>
              {logs.length > 0 && (
                <span>
                  Personal best: <span className="text-neutral-100">{personalBest}%</span>
                </span>
              )}
            </div>
            <ScoreTrendChart series={series} dateFormat={dateFormat()} />
            <div>
              <h3 className="mb-2 text-sm text-neutral-300">Where your hits land</h3>
              <BarList
                rows={zones.map((z) => ({
                  label: z.zone_label,
                  value: z.counted,
                  note: zoneTotal ? `${Math.round((z.counted / zoneTotal) * 100)}%` : undefined,
                }))}
                unit="hits"
                emptyText="No scored hits on this course yet."
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-500">No courses of fire yet.</p>
        )}
        </div>
      </Collapsible>

      <Collapsible id="categories" scope="stats" title="By Category" defaultOpen={open("categories", true)}>
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className={th}>Category</th>
                <th className={th}>Sessions</th>
                <th className={th}>Average</th>
                <th className={th}>Best</th>
                <th className={th}>Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.category}>
                  <td className={td}>{c.category}</td>
                  <td className={td}>{c.sessions}</td>
                  <td className={td}>{c.avg != null ? `${c.avg}%` : "—"}</td>
                  <td className={td}>{c.best != null ? `${c.best}%` : "—"}</td>
                  <td className={td}>{c.graded ? `${Math.round((c.passed / c.graded) * 100)}% (${c.passed}/${c.graded})` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {byCategory.length === 0 && <p className="px-3 py-6 text-center text-sm text-neutral-500">No range sessions on a course yet.</p>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">A course in more than one category counts toward each.</p>
      </Collapsible>

      <Collapsible id="courses" scope="stats" title="By Course" defaultOpen={open("courses", true)}>
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className={th}>Course</th>
                <th className={th}>Sessions</th>
                <th className={th}>Average</th>
                <th className={th}>Best</th>
                <th className={th}>Pass rate</th>
                <th className={th}>Last shot</th>
              </tr>
            </thead>
            <tbody>
              {shotCourses.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <Link href={`/stats?cof=${c.id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {c.name}
                    </Link>
                  </td>
                  <td className={td}>{c.sessions}</td>
                  <td className={td}>{c.avg != null ? `${c.avg}%` : "—"}</td>
                  <td className={td}>{c.best != null ? `${c.best}%` : "—"}</td>
                  <td className={td}>{c.graded ? `${Math.round((c.passed / c.graded) * 100)}% (${c.passed}/${c.graded})` : "—"}</td>
                  <td className={td}>{fd(c.last) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shotCourses.length === 0 && <p className="px-3 py-6 text-center text-sm text-neutral-500">No range sessions logged yet.</p>}
        </div>
      </Collapsible>

      <Collapsible id="firearms" scope="stats" title="By Firearm" defaultOpen={open("firearms", true)}>
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className={th}>Firearm</th>
                <th className={th}>Rounds</th>
                <th className={th}>Sessions</th>
                <th className={th}>Average</th>
                <th className={th}>Best</th>
                <th className={th}>Malfunctions</th>
                <th className={th}>Per 1,000 rds</th>
              </tr>
            </thead>
            <tbody>
              {byFirearm.map((f) => (
                <tr key={f.id}>
                  <td className={td}>
                    <Link href={`/inventory/${f.id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {f.label}
                    </Link>
                  </td>
                  <td className={td}>{f.shots_fired.toLocaleString()}</td>
                  <td className={td}>{f.sessions}</td>
                  <td className={td}>{f.avg != null ? `${f.avg}%` : "—"}</td>
                  <td className={td}>{f.best != null ? `${f.best}%` : "—"}</td>
                  <td className={td}>{f.malfunctions}</td>
                  <td className={td}>
                    {f.shots_fired > 0 ? ((f.malfunctions / f.shots_fired) * 1000).toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <Collapsible id="ammo-cost" scope="stats" title="Ammo Cost" defaultOpen={open("ammo-cost", true)}>
        <p className="mb-2 text-xs text-neutral-500">
          Cost per round comes from purchases with a price entered. Estimated spend = rounds fired × cost per round.
        </p>
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className={th}>Caliber</th>
                <th className={th}>Purchased</th>
                <th className={th}>Total spent</th>
                <th className={th}>Per round</th>
                <th className={th}>Rounds fired</th>
                <th className={th}>Est. spend shooting</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.caliber}>
                  <td className={td}>{c.caliber}</td>
                  <td className={td}>{c.purchased.toLocaleString()}</td>
                  <td className={td}>{c.spent ? money(c.spent, cur) : "—"}</td>
                  <td className={td}>{c.cpr != null ? money(Math.round(c.cpr * 1000) / 1000, cur) : "—"}</td>
                  <td className={td}>{c.fired.toLocaleString()}</td>
                  <td className={td}>{c.fired_cost != null ? money(Math.round(c.fired_cost * 100) / 100, cur) : "—"}</td>
                </tr>
              ))}
            </tbody>
            {costs.length > 0 && (
              <tfoot>
                <tr>
                  <td className={td} colSpan={5}>
                    Total estimated spend shooting
                  </td>
                  <td className={`${td} font-medium`}>{money(Math.round(totalAmmoSpend * 100) / 100, cur)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {costs.length === 0 && <p className="px-3 py-6 text-center text-sm text-neutral-500">No ammo purchases logged yet.</p>}
        </div>
      </Collapsible>
    </div>
  );
}
