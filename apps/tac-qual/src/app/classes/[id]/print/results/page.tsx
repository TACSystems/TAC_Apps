import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { classCourses, classInstructors, classNumberLabel, getClass } from "@/lib/classes";
import { classResults } from "@/lib/scoring";
import { fd } from "@/lib/display";
import PrintSheet from "@/components/PrintSheet";
import ResultBadge from "@/components/ResultBadge";

export const dynamic = "force-dynamic";

export default async function ResultsPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();

  const courses = classCourses(db, id);
  const instructors = classInstructors(db, id);
  const profile = db.prepare(`select name, title from instructor_profile where id = 'me'`).get() as
    | { name: string; title: string | null }
    | undefined;

  return (
    <PrintSheet
      title="Class Results"
      subtitle={`${classNumberLabel(klass.number)} · ${fd(klass.date)}`}
      backHref={`/classes/${id}`}
      backLabel={klass.title}
    >
      <div className="space-y-1 text-sm">
        <div>
          <strong>{klass.title}</strong>
        </div>
        {klass.location && <div>Location: {klass.location}</div>}
        {instructors.length > 0 && <div>Instructors: {instructors.map((i) => i.name).join(", ")}</div>}
      </div>

      {courses.map((c) => {
        const runs = classResults(db, id, c.cof_id);
        if (runs.length === 0) return null;
        const passes = runs.filter((r) => r.passed === 1).length;
        return (
          <section key={c.cof_id} className="space-y-2">
            <h2 className="text-xs tracking-widest">
              {c.name.toUpperCase()} · {passes}/{runs.length} PASSED
              {c.passing_score_percent != null ? ` · ${c.passing_score_percent}% TO PASS` : ""}
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th className="w-16">Relay</th>
                  <th className="w-16">Lane</th>
                  <th>Student</th>
                  <th className="w-20">Attempt</th>
                  <th className="w-24 text-right">Points</th>
                  <th className="w-20 text-right">%</th>
                  <th className="w-28">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.relay ?? ""}</td>
                    <td>{r.lane ?? ""}</td>
                    <td>{`${r.last_name}, ${r.first_name}`}</td>
                    <td>
                      {r.attempt}
                      {r.kind === "remedial" ? "R" : ""}
                    </td>
                    <td className="text-right">{r.total_points ?? ""}</td>
                    <td className="text-right">{r.final_score_percent?.toFixed(1) ?? ""}</td>
                    <td>
                      <ResultBadge passed={r.passed === 1} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section className="pt-8 text-sm">
        <div className="flex flex-wrap gap-12">
          <div>
            <div className="sign-line">&nbsp;</div>
            <div className="mt-1 text-xs tracking-widest">
              {profile?.name ? profile.name.toUpperCase() : "INSTRUCTOR"}
              {profile?.title ? ` · ${profile.title.toUpperCase()}` : ""}
            </div>
          </div>
          <div>
            <div className="sign-line">&nbsp;</div>
            <div className="mt-1 text-xs tracking-widest">DATE</div>
          </div>
        </div>
      </section>
    </PrintSheet>
  );
}
