import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import PageHeader from "@core/components/PageHeader";
import { fmtSeconds } from "@core/lib/run-clock";
import { getRun, runFirearms } from "@/lib/course-runs";
import { getSession, sessionNo } from "@/lib/sessions";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const run = getRun(db, id);
  if (!run) notFound();

  const course = run.cof_id
    ? (db.prepare(`select id, name, code from courses_of_fire where id = ?`).get(run.cof_id) as
        | { id: string; name: string; code: string | null }
        | undefined)
    : undefined;
  const firearms = runFirearms(db, id);
  const scored = db.prepare(`select id, final_score_percent from range_log where run_id = ?`).get(id) as
    | { id: string; final_score_percent: number | null }
    | undefined;
  const session = run.session_id ? getSession(db, run.session_id) : undefined;
  const rounds = firearms.reduce((n, f) => n + f.rounds, 0);
  const options = run.options_json ? (JSON.parse(run.options_json) as Record<string, string>) : {};

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={course?.name ?? "Course run"}
        icon="timer"
        subtitle={`${run.combined_arms ? "Combined Arms Course" : "Course run"} · ${fd(run.date)}${
          course?.code ? ` · ${course.code}` : ""
        }`}
        back={
          session
            ? { href: `/range-log/session/${session.id}`, label: `Range Session ${sessionNo(session.number)}` }
            : { href: "/range-log", label: "Range Log" }
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 border border-neutral-800 bg-neutral-900 p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-neutral-500">Course Time</div>
          <div className="text-lg">{run.elapsed_seconds != null ? fmtSeconds(run.elapsed_seconds) : "—"}</div>
          {run.paused_seconds ? (
            <div className="text-xs text-neutral-500">{fmtSeconds(run.paused_seconds)} paused, not counted</div>
          ) : null}
        </div>
        <div>
          <div className="text-neutral-500">Strings Fired</div>
          <div className="text-lg">{run.strings_fired}</div>
        </div>
        <div>
          <div className="text-neutral-500">Skipped</div>
          <div className="text-lg">{run.strings_skipped}</div>
        </div>
        <div>
          <div className="text-neutral-500">Re-runs</div>
          <div className="text-lg">{run.reruns}</div>
        </div>
      </div>

      <section className="mb-4 border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <h2 className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
          Rounds fired · {rounds.toLocaleString()} total
          {run.corrected ? " · counts corrected on the tally" : ""}
        </h2>
        <ul className="grid gap-1">
          {firearms.map((f) => (
            <li
              key={`${f.weapon ?? ""}-${f.firearm_id ?? "none"}`}
              className="flex justify-between gap-3 border-b border-neutral-800 py-1 last:border-b-0"
            >
              <span>
                {f.weapon ? <span className="text-neutral-500">{f.weapon}: </span> : null}
                {f.firearm_id ? (
                  <Link href={`/inventory/${f.firearm_id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {f.label}
                  </Link>
                ) : (
                  <span className="text-neutral-500">Not recorded against a firearm</span>
                )}
              </span>
              <span>{f.rounds.toLocaleString()} rounds</span>
            </li>
          ))}
        </ul>
        {Object.keys(options).length > 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Options chosen: {Object.entries(options).map(([phase, opt]) => `${phase} — ${opt}`).join(" · ")}
          </p>
        )}
      </section>

      {scored ? (
        <Link href={`/range-log/${scored.id}`} className="btn btn-secondary">
          View score{scored.final_score_percent != null ? ` · ${scored.final_score_percent}%` : ""}
        </Link>
      ) : course ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/courses/${course.id}/log?run=${run.id}`} className="btn btn-primary">
            Score this run
          </Link>
          <span className="text-sm text-neutral-500">
            The rounds above are already recorded. Scoring adds the score, not the rounds again.
          </span>
        </div>
      ) : null}
    </div>
  );
}
