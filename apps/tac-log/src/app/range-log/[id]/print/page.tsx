import { fd } from "@/lib/display";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { DEFAULT_SCORECARD, loadCourse, parseJson, type LoadedCourse } from "@core/lib/cof";
import type { RangeLog, RangeLogZoneCount } from "@/lib/db/types";
import PrintButton from "@core/components/PrintButton";
import { PrintFooter, PrintHeader, PrintScorecard } from "@core/components/CourseSheet";

export const dynamic = "force-dynamic";

export default async function RangeLogPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const log = db
    .prepare(
      `select rl.*, firearm_label(f.make_model, f.nickname) as firearm_make_model from range_log rl
       left join firearms f on f.id = rl.firearm_id where rl.id = ?`
    )
    .get(id) as (RangeLog & { firearm_make_model: string | null }) | undefined;
  if (!log) notFound();

  const zoneCounts = db
    .prepare(`select * from range_log_zone_counts where range_log_id = ? order by value desc`)
    .all(id) as RangeLogZoneCount[];

  const course: LoadedCourse = (log.cof_id ? loadCourse(db, log.cof_id) : null) ?? {
    id: "",
    code: "—",
    name: "Range Log",
    notes: null,
    categories: [],
    total_rounds: log.rounds_fired,
    target_type_id: null,
    passing_score_percent: log.passing_score_percent,
    columns: [],
    scorecard: DEFAULT_SCORECARD,
    phases: [],
    target: null,
    computed_total_rounds: log.rounds_fired ?? 0,
    effective_total_rounds: log.rounds_fired ?? 0,
  };

  const fields: Record<string, string | null> = {
    ...parseJson<Record<string, string>>(log.custom_fields_json, {}),
    date: fd(log.date),
    range_location: log.range_location,
    weapon_used: [log.firearm_make_model, log.weapon_used].filter(Boolean).join(" — ") || null,
    caliber: log.caliber,
    grain: log.grain != null ? String(log.grain) : null,
    ammo_lot: log.ammo_lot,
    weather_conditions: log.weather_conditions,
    grader_name: log.grader_name,
  };

  return (
    <div className="print-sheet mx-auto max-w-3xl bg-white p-8 text-black">
      <div className="no-print mb-4">
        <PrintButton label="Print Scorecard" />
      </div>
      <PrintHeader course={course} />
      <PrintScorecard
        course={course}
        filled={{
          fields,
          zones: zoneCounts,
          rounds_fired: log.rounds_fired,
          rounds_counted: log.rounds_counted,
          total_points: log.total_points,
          final_score_percent: log.final_score_percent,
          passing_score_percent: log.passing_score_percent,
          notes: log.notes,
        }}
      />
      <PrintFooter />
    </div>
  );
}
