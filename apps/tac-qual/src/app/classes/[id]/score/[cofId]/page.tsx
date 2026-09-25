import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { classNumberLabel, getClass, relays } from "@/lib/classes";
import { studentFirearms, studentName } from "@/lib/students";
import { countsForRun, courseMeta, latestAttempt, runsForClassCourse } from "@/lib/scoring";
import ScoringGrid, { type GridStudent } from "@/components/ScoringGrid";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function ScorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; cofId: string }>;
  searchParams: Promise<{ relay?: string; attempt?: string }>;
}) {
  const { id, cofId } = await params;
  const sp = await searchParams;
  const db = getDb();

  const klass = getClass(db, id);
  if (!klass) notFound();
  const meta = courseMeta(db, cofId);
  if (!meta) notFound();

  const byRelay = relays(db, id);
  if (byRelay.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Score — ${meta.name}`}
          subtitle={`${klass.title} · ${classNumberLabel(klass.number)}`}
          back={{ href: `/classes/${id}`, label: klass.title }}
        />
        <p className="text-neutral-400">
          Nobody is enrolled in this class yet. <a href={`/classes/${id}`}>Add students and relays</a> first.
        </p>
      </div>
    );
  }

  const relayKeys = byRelay.map(([r]) => r);
  const requested = sp.relay != null && sp.relay !== "" ? Number(sp.relay) : null;
  const activeRelay =
    requested != null && relayKeys.some((r) => r === requested) ? requested : (relayKeys[0] ?? null);
  const rows = byRelay.find(([r]) => r === activeRelay)?.[1] ?? [];

  const highest = Math.max(
    0,
    ...rows.map((r) => latestAttempt(db, id, r.student_id, cofId))
  );
  const attempt = sp.attempt ? Math.max(1, Number(sp.attempt) || 1) : Math.max(1, highest || 1);
  const kind = attempt > 1 ? "remedial" : "qual";

  const existing = runsForClassCourse(db, id, cofId, attempt);
  const byStudent = new Map(existing.map((r) => [r.student_id, r]));

  const students: GridStudent[] = rows.map((r) => {
    const run = byStudent.get(r.student_id) ?? null;
    const guns = studentFirearms(db, r.student_id);
    return {
      student_id: r.student_id,
      name: studentName(r),
      relay: r.relay,
      lane: r.lane,
      counts: run ? countsForRun(db, run.id) : {},
      firearm: run?.firearm_desc ?? (guns[0] ? `${guns[0].make_model}${guns[0].caliber ? ` · ${guns[0].caliber}` : ""}` : null),
    };
  });

  if (meta.zones.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Score — ${meta.name}`}
          subtitle={`${klass.title} · ${classNumberLabel(klass.number)}`}
          back={{ href: `/classes/${id}`, label: klass.title }}
        />
        <p className="text-neutral-400">
          This course has no target type with scoring zones, so there is nothing to score against. Open the course and
          set its target type first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Score — ${meta.name}`}
        subtitle={`${klass.title} · ${classNumberLabel(klass.number)} · ${fd(klass.date)}`}
        back={{ href: `/classes/${id}`, label: klass.title }}
      />

      <div className="flex flex-wrap items-center gap-4 text-xs tracking-widest text-neutral-400">
        <span>
          {meta.totalRounds ? `${meta.totalRounds} rounds` : "Rounds not set"} · {meta.maxPoints} possible
          {meta.passing != null ? ` · ${meta.passing}% to pass` : " · no pass mark set"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tracking-widest text-neutral-400">Relay</span>
        {byRelay.map(([r, members]) => (
          <a
            key={String(r)}
            href={`/classes/${id}/score/${cofId}?relay=${r ?? ""}&attempt=${attempt}`}
            className={`btn ${r === activeRelay ? "btn-primary" : ""}`}
          >
            {r == null ? "Unassigned" : `Relay ${r}`} ({members.length})
          </a>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tracking-widest text-neutral-400">Attempt</span>
        {Array.from({ length: Math.max(1, highest) + 1 }, (_, i) => i + 1).map((n) => (
          <a
            key={n}
            href={`/classes/${id}/score/${cofId}?relay=${activeRelay ?? ""}&attempt=${n}`}
            className={`btn ${n === attempt ? "btn-primary" : ""}`}
          >
            {n === 1 ? "Qualification" : `Remedial ${n - 1}`}
          </a>
        ))}
      </div>

      <section className="brk card p-4">
        <ScoringGrid
          classId={id}
          cofId={cofId}
          date={klass.date}
          attempt={attempt}
          kind={kind}
          zones={meta.zones}
          maxPoints={meta.maxPoints}
          passing={meta.passing}
          totalRounds={meta.totalRounds}
          students={students}
        />
      </section>
    </div>
  );
}
