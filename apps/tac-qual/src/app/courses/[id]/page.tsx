import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import PrintButton from "@core/components/PrintButton";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { maxPointsFor } from "@core/lib/cof-shared";
import { listTargetTypes } from "@core/lib/cof";
import SubmitButton from "@core/components/SubmitButton";
import Collapsible from "@core/components/Collapsible";
import { saveCourseScoring } from "@/app/targets/actions";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const zones = course.target?.zones ?? [];
  const targets = listTargetTypes(db);
  const maxPoints = maxPointsFor(course.total_rounds ?? 0, zones);

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.name}
        subtitle={course.code}
        back={{ href: "/courses", label: "Courses of Fire" }}
        actions={
          <div className="flex gap-2">
            <a className="btn" href={`/timer?course=${course.id}`}>
              Run Par Timer
            </a>
            <PrintButton />
          </div>
        }
      />

      <section className="brk card p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Rounds</dt>
            <dd className="text-2xl font-bold">{course.total_rounds ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Max points</dt>
            <dd className="text-2xl font-bold">{maxPoints || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">To pass</dt>
            <dd className="text-2xl font-bold">
              {course.passing_score_percent != null ? `${course.passing_score_percent}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Target type</dt>
            <dd className="text-2xl font-bold">{course.target?.name ?? "—"}</dd>
          </div>
        </dl>
      </section>


      <Collapsible
        scope={`course:${id}`}
        id="scoring"
        title="Scoring Setup"
        defaultOpen={zones.length === 0}
        summary={zones.length === 0 ? "Not scorable yet" : `${course.target?.name} · ${maxPoints} possible`}
      >
        <form action={saveCourseScoring} className="space-y-4 p-4">
          <input type="hidden" name="cof_id" value={course.id} />
          {zones.length === 0 && (
            <p className="text-amber-400">
              This course has no target type, so it cannot be scored. Pick one below, or{" "}
              <Link href="/targets">create a target type</Link> first.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              <span>Target type</span>
              <select className="input" name="target_type_id" defaultValue={course.target_type_id ?? ""}>
                <option value="">None</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Total rounds</span>
              <input
                className="input"
                type="number"
                name="total_rounds"
                min={0}
                defaultValue={course.total_rounds ?? ""}
              />
            </label>
            <label className="field">
              <span>Percent to pass</span>
              <input
                className="input"
                type="number"
                name="passing_score_percent"
                min={0}
                max={100}
                step="0.1"
                defaultValue={course.passing_score_percent ?? ""}
              />
            </label>
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save Scoring
          </SubmitButton>
        </form>
      </Collapsible>

      {zones.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-xs tracking-widest text-neutral-400">Scoring zones</h2>
          <div className="flex flex-wrap gap-2">
            {zones.map((z) => (
              <span key={z.zone_label} className="border border-neutral-700 px-3 py-1">
                {z.zone_label} · {z.value} pt
              </span>
            ))}
          </div>
        </section>
      )}

      {course.phases.map((p, pi) => (
        <section key={pi} className="card p-4">
          <h2 className="mb-3 font-bold">{p.title}</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>String</th>
                  {course.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.strings.map((s, si) => (
                  <tr key={si}>
                    <td className="font-bold">
                      {s.row_type === "string" ? (s.string_number ?? "—") : s.option_label ?? "—"}
                    </td>
                    {course.columns.map((c) => (
                      <td key={c.key}>{s.values[c.key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {course.notes && <p className="whitespace-pre-wrap text-neutral-300">{course.notes}</p>}
    </div>
  );
}
