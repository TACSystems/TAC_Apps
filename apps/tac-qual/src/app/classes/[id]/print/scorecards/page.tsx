import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { classNumberLabel, getClass, relays } from "@/lib/classes";
import { studentName } from "@/lib/students";
import { courseMeta } from "@/lib/scoring";
import { loadCourse } from "@core/lib/cof";
import { fd } from "@/lib/display";
import PrintSheet from "@/components/PrintSheet";

export const dynamic = "force-dynamic";

export default async function ScorecardsPrint({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cof?: string }>;
}) {
  const { id } = await params;
  const { cof } = await searchParams;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass || !cof) notFound();
  const meta = courseMeta(db, cof);
  const course = loadCourse(db, cof);
  if (!meta || !course) notFound();

  const students = relays(db, id).flatMap(([, rows]) => rows);

  return (
    <PrintSheet
      title="Blank Scorecards"
      subtitle={`${classNumberLabel(klass.number)} · ${fd(klass.date)}`}
      backHref={`/classes/${id}`}
      backLabel={klass.title}
    >
      <p className="text-sm print:hidden">
        One card per enrolled student for {meta.name}. {students.length} card{students.length === 1 ? "" : "s"}.
      </p>

      {students.map((s, i) => (
        <section key={s.id} className={`space-y-3 border border-neutral-700 p-4 print:border-black ${i < students.length - 1 ? "page-break" : ""}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-bold tracking-widest">{meta.name.toUpperCase()}</h2>
            <span className="text-xs tracking-widest">
              {meta.totalRounds ? `${meta.totalRounds} RDS` : ""} · {meta.maxPoints} POSSIBLE
              {meta.passing != null ? ` · ${meta.passing}% TO PASS` : ""}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              Student: <strong>{studentName(s)}</strong>
            </div>
            <div>
              Relay: {s.relay ?? "____"} &nbsp; Lane: {s.lane ?? "____"}
            </div>
            <div>Date: {fd(klass.date)}</div>
            <div className="sm:col-span-2">
              Firearm: <span className="sign-line">&nbsp;</span>
            </div>
            <div>
              Caliber: <span className="sign-line">&nbsp;</span>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Zone</th>
                {meta.zones.map((z) => (
                  <th key={z.zone_label} className="text-right">
                    {z.zone_label}
                    <span className="block text-[10px] font-normal">{z.value} pt</span>
                  </th>
                ))}
                <th className="text-right">Points</th>
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-xs tracking-widest">HITS</td>
                {meta.zones.map((z) => (
                  <td key={z.zone_label} className="h-10" />
                ))}
                <td />
                <td />
              </tr>
            </tbody>
          </table>

          {course.phases.map((p, pi) => (
            <div key={pi} className="text-xs">
              <div className="font-bold tracking-widest">{p.title.toUpperCase()}</div>
              <ul className="ml-4 list-disc">
                {p.strings
                  .filter((st) => st.row_type === "string")
                  .map((st, sti) => (
                    <li key={sti}>
                      String {st.string_number ?? "?"}
                      {st.values.distance ? ` · ${st.values.distance}` : ""}
                      {st.values.rounds ? ` · ${st.values.rounds} rds` : ""}
                      {st.values.time_limit ? ` · ${st.values.time_limit}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-wrap gap-8 pt-4 text-xs">
            <div>
              <span className="sign-line">&nbsp;</span>
              <div className="mt-1 tracking-widest">SHOOTER</div>
            </div>
            <div>
              <span className="sign-line">&nbsp;</span>
              <div className="mt-1 tracking-widest">GRADER</div>
            </div>
          </div>
        </section>
      ))}
    </PrintSheet>
  );
}
