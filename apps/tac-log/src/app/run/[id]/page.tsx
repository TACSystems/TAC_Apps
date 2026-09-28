import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { parseParSeconds } from "@core/lib/par";
import type { RunString } from "@core/lib/run-clock";
import RunCourse from "@core/components/RunCourse";
import PreviousRun from "@/components/PreviousRun";
import { armoryForRun, previousRuns } from "@/lib/previous-runs";
import RunSetup from "@/components/RunSetup";

export const dynamic = "force-dynamic";

/**
 * A rounds cell is not always one number: "2 / 2" is a string fired in two
 * parts, which is four rounds, not twenty-two. Sum what is there.
 */
function roundsOf(v: string | undefined) {
  if (!v) return null;
  const parts = String(v).match(/\d+(?:\.\d+)?/g);
  if (!parts) return null;
  const n = parts.reduce((sum, p) => sum + Number(p), 0);
  return n > 0 ? Math.round(n) : null;
}

export default async function RunCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ firearm?: string }>;
}) {
  const { id } = await params;
  const { firearm } = await searchParams;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const labelFor = (k: string) => course.columns.find((c) => c.key === k)?.label ?? k;

  const strings: RunString[] = course.phases.flatMap((p, pi) =>
    p.strings
      .filter((s) => s.row_type === "string")
      .map((s, si) => ({
        id: `p${pi}s${si}`,
        phase: p.title,
        label: [s.values.distance, s.values.rounds ? `${s.values.rounds} rounds` : null]
          .filter(Boolean)
          .join(" — ") || `String ${si + 1}`,
        par: parseParSeconds(s.values.time_limit),
        rounds: roundsOf(s.values.rounds),
        details: [
          s.values.action ?? null,
          ...course.columns
            .filter((c) => !["distance", "rounds", "time_limit", "action"].includes(c.key) && s.values[c.key])
            .map((c) => `${labelFor(c.key)}: ${s.values[c.key]}`),
        ].filter((d): d is string => Boolean(d)),
      }))
  );

  const phaseOptions: Record<string, string[]> = {};
  for (const p of course.phases) {
    const opts = [...new Set(p.strings.map((s) => s.option_label).filter((o): o is string => Boolean(o)))];
    if (opts.length > 1) phaseOptions[p.title] = opts;
  }

  const rounds = strings.reduce((n, s) => n + (s.rounds ?? 0), 0);

  // No firearm chosen yet: ask before anything starts, because the rounds
  // this run tallies are posted to that firearm's record.
  if (!firearm) {
    const { list, lastUsed } = armoryForRun(db, id);
    return (
      <RunSetup courseId={id} courseName={course.name} rounds={rounds} armory={list} lastUsed={lastUsed} />
    );
  }

  const firearmId = firearm === "none" ? null : firearm;
  const chosen = firearmId
    ? (db
        .prepare(`select firearm_label(make_model, nickname) as label from firearms where id = ?`)
        .get(firearmId) as { label: string } | undefined)
    : undefined;
  if (firearmId && !chosen) notFound();

  const { last, best, scope } = previousRuns(db, id, firearmId);

  return (
    <RunCourse
      app="TAC-LOG"
      courseName={course.name}
      courseCode={course.code}
      strings={strings}
      phaseOptions={phaseOptions}
      exitHref={`/courses/${id}`}
      contextLabel={`${chosen?.label ?? "Not in Armory"} · ${rounds} rounds`}
    >
      <PreviousRun last={last} best={best} scope={scope} />
    </RunCourse>
  );
}
