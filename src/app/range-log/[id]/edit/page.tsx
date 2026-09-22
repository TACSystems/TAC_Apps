import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { DEFAULT_SCORECARD, loadCourse, maxPointsFor, parseJson } from "@/lib/cof";
import type { Firearm, RangeLog, RangeLogZoneCount } from "@/lib/db/types";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import ScoringForm from "@/components/ScoringForm";
import { updateRangeLog } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditRangeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const log = db.prepare(`select * from range_log where id = ?`).get(id) as RangeLog | undefined;
  if (!log) notFound();

  const course = log.cof_id ? loadCourse(db, log.cof_id) : null;
  const zoneRows = db
    .prepare(`select * from range_log_zone_counts where range_log_id = ? order by value desc`)
    .all(id) as RangeLogZoneCount[];
  const zones = zoneRows.map((z) => ({ zone_label: z.zone_label, value: z.value }));
  const counts = Object.fromEntries(zoneRows.map((z) => [z.zone_label, z.counted]));

  const firearms = db
    .prepare(`select * from firearms where status = 'active' or id = ? order by make_model`)
    .all(log.firearm_id ?? "") as Firearm[];

  const scorecard = course?.scorecard ?? DEFAULT_SCORECARD;
  const fields = [...scorecard.header, ...scorecard.signoff].filter((f) => !f.printOnly && f.key !== "date");
  const defaults: Record<string, string> = {
    ...parseJson<Record<string, string>>(log.custom_fields_json, {}),
  };
  for (const [k, v] of Object.entries({
    range_location: log.range_location,
    weapon_used: log.weapon_used,
    caliber: log.caliber,
    grain: log.grain != null ? String(log.grain) : null,
    ammo_lot: log.ammo_lot,
    weather_conditions: log.weather_conditions,
    grader_name: log.grader_name,
  })) {
    if (v) defaults[k] = v;
  }

  const total = course?.effective_total_rounds ?? log.rounds_fired ?? 0;

  return (
    <div className="max-w-2xl">
      <Link href={`/range-log/${id}`} className="text-xs text-blue-400 hover:text-blue-300">
        ← Back to session
      </Link>
      <h1 className="text-xl font-semibold">Edit Range Session</h1>
      <p className="mb-4 text-sm text-neutral-400">
        {course?.name ?? "Course no longer on file"} · scored with the zone values it was logged with. Changing the
        firearm or rounds fired updates both firearms&apos; shot counts.
      </p>
      <ScoringForm
        zones={zones}
        fields={fields}
        firearms={firearms}
        totalRounds={total}
        maxPoints={maxPointsFor(total, zones)}
        passing={log.passing_score_percent}
        defaults={defaults}
        suggestions={{
          range_location: getDropdownOptions(db, "range_location"),
          weather_conditions: getDropdownOptions(db, "weather"),
          caliber: getDropdownOptions(db, "caliber"),
        }}
        initial={{
          date: log.date,
          firearm_id: log.firearm_id,
          rounds_fired: log.rounds_fired,
          counts,
          notes: log.notes,
          passing: log.passing_score_percent,
        }}
        action={updateRangeLog.bind(null, id)}
        submitLabel="Save Changes"
      />
    </div>
  );
}
