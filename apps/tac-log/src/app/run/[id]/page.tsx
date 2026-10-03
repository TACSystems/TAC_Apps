import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { parseParSeconds } from "@core/lib/par";
import { matchWeaponPart, roundsPartsFor, splitWeaponCell } from "@core/lib/course-categories";
import type { RunString } from "@core/lib/run-clock";
import RunCourse from "@core/components/RunCourse";
import PreviousRun from "@/components/PreviousRun";
import { armoryForRun, previousRuns } from "@/lib/previous-runs";
import RunSetup from "@/components/RunSetup";
import { finishRun } from "./actions";

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

/** `fa=Handgun:<id>` once per weapon, or `fa=:<id>` on a single-weapon course. */
function parsePicks(fa: string | string[] | undefined, legacy: string | undefined) {
  const picks = new Map<string, string>();
  for (const raw of Array.isArray(fa) ? fa : fa ? [fa] : []) {
    const at = raw.indexOf(":");
    if (at < 0) continue;
    picks.set(raw.slice(0, at), raw.slice(at + 1));
  }
  if (!picks.size && legacy) picks.set("", legacy);
  return picks;
}

export default async function RunCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fa?: string | string[]; firearm?: string }>;
}) {
  const { id } = await params;
  const { fa, firearm } = await searchParams;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const labelFor = (k: string) => course.columns.find((c) => c.key === k)?.label ?? k;

  const strings: RunString[] = course.phases.flatMap((p, pi) =>
    p.strings
      .filter((s) => s.row_type === "string")
      .map((s, si) => {
        const weapons = splitWeaponCell(s.values.weapon).map(
          (part) => matchWeaponPart(part, course.categories) ?? part
        );
        const parts = weapons.length > 1 ? roundsPartsFor(s.values.rounds, weapons.length) : [];
        return {
          id: `p${pi}s${si}`,
          phase: p.title,
          label: [s.values.distance, s.values.rounds ? `${s.values.rounds} rounds` : null]
            .filter(Boolean)
            .join(" — ") || `String ${si + 1}`,
          par: parseParSeconds(s.values.time_limit),
          rounds: roundsOf(s.values.rounds),
          weapons,
          roundParts: parts.map((v) => roundsOf(v)),
          details: [
            s.values.action ?? null,
            ...course.columns
              .filter((c) => !["distance", "rounds", "time_limit", "action"].includes(c.key) && s.values[c.key])
              .map((c) => `${labelFor(c.key)}: ${s.values[c.key]}`),
          ].filter((d): d is string => Boolean(d)),
        };
      })
  );

  const phaseOptions: Record<string, string[]> = {};
  for (const p of course.phases) {
    const opts = [...new Set(p.strings.map((s) => s.option_label).filter((o): o is string => Boolean(o)))];
    if (opts.length > 1) phaseOptions[p.title] = opts;
  }

  const rounds = strings.reduce((n, s) => n + (s.rounds ?? 0), 0);
  const picks = parsePicks(fa, firearm);
  const { slots, lastUsed } = armoryForRun(db, id, course.categories);

  // Nothing chosen yet: ask before anything starts, because the rounds this
  // run tallies are posted to the firearm that fired them.
  if (picks.size < slots.length) {
    return (
      <RunSetup courseId={id} courseName={course.name} rounds={rounds} slots={slots} lastUsed={lastUsed} />
    );
  }

  const nameOf = db.prepare(`select firearm_label(make_model, nickname) as label from firearms where id = ?`);
  const destinations: Record<string, string> = {};
  const chosenIds: string[] = [];
  for (const [weapon, value] of picks) {
    if (value === "none" || !value) continue;
    const row = nameOf.get(value) as { label: string } | undefined;
    if (!row) notFound();
    destinations[weapon] = row.label;
    chosenIds.push(value);
  }

  // The previous-run panel compares like for like, which only means anything
  // when one firearm shot the course.
  const { last, best, scope } = previousRuns(db, id, chosenIds.length === 1 ? chosenIds[0] : null);
  const context = Object.entries(destinations).map(([w, label]) => (w ? `${w}: ${label}` : label));

  return (
    <RunCourse
      app="TAC-LOG"
      courseName={course.name}
      courseCode={course.code}
      strings={strings}
      phaseOptions={phaseOptions}
      exitHref={`/courses/${id}`}
      destinations={destinations}
      onFinish={finishRun.bind(null, id, Object.fromEntries(picks))}
      contextLabel={`${context.length ? context.join(" · ") : "Not in Armory"} · ${rounds} rounds`}
    >
      <PreviousRun last={last} best={best} scope={scope} />
    </RunCourse>
  );
}
