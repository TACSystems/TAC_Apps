import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse, maxPointsFor } from "@/lib/cof";
import type { Firearm } from "@/lib/db/types";
import ScoringForm from "@/components/ScoringForm";
import { getSettings } from "@/lib/settings";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { submitRangeLog } from "./actions";
import { lastPicks, pickOptions } from "@/lib/ammo";

export const dynamic = "force-dynamic";

export default async function LogRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; location?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const firearms = db
    .prepare(`select *, firearm_label(make_model, nickname) as label from firearms where status = 'active' order by make_model`)
    .all() as Firearm[];

  const settings = getSettings(db);
  const defaults: Record<string, string> = {};
  if (settings.defaultShooterName) defaults.shooter_name = settings.defaultShooterName;
  if (settings.defaultGraderName) defaults.grader_name = settings.defaultGraderName;
  if (settings.defaultRangeLocation) defaults.range_location = settings.defaultRangeLocation;
  if (sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)) defaults.date = sp.date;
  if (sp.location !== undefined) defaults.range_location = String(sp.location).slice(0, 200);
  const matchCategories = course.categories;
  const suggestions = {
    range_location: getDropdownOptions(db, "range_location"),
    weather_conditions: getDropdownOptions(db, "weather"),
    caliber: getDropdownOptions(db, "caliber"),
  };

  const fields = [...course.scorecard.header, ...course.scorecard.signoff].filter(
    (f) => !f.printOnly && f.key !== "date"
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`/courses/${id}`} className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← {course.name}
          </Link>
          <h1 className="text-xl font-semibold">Log a Range Session</h1>
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
          matchCategories={matchCategories}
          graderDateFollows={settings.graderDateFromSession}
          zones={course.target.zones}
          fields={fields}
          firearms={firearms}
          totalRounds={course.effective_total_rounds}
          maxPoints={maxPointsFor(course.effective_total_rounds, course.target.zones)}
          passing={course.passing_score_percent}
          defaults={defaults}
          suggestions={suggestions}
          action={submitRangeLog.bind(null, id)}
          ammoOptions={pickOptions(db)}
          lastPicks={lastPicks(db)}
        />
      ) : (
        <p className="text-sm text-neutral-400">
          This course has no target type, so there&apos;s nothing to score against.{" "}
          <Link href={`/courses/${id}/edit`} className="text-brand-amber hover:text-brand-amber-light">
            Pick one in the editor
          </Link>
          .
        </p>
      )}
    </div>
  );
}
