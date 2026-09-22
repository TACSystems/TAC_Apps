import { getDb } from "@/lib/db";
import type { CourseOfFire, CofPhase, CofString, CofScoringZone } from "@/lib/db/types";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function CoursePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const course = db.prepare(`select * from courses_of_fire where id = ?`).get(id) as
    | CourseOfFire
    | undefined;
  if (!course) notFound();

  const phases = db
    .prepare(`select * from cof_phases where cof_id = ? order by phase_number`)
    .all(id) as CofPhase[];

  const strings = db
    .prepare(
      `select s.* from cof_strings s
       join cof_phases p on p.id = s.phase_id
       where p.cof_id = ?
       order by s.string_number`
    )
    .all(id) as CofString[];

  const zones = db
    .prepare(`select * from cof_scoring_zones where cof_id = ?`)
    .all(id) as CofScoringZone[];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black">
      <div className="no-print mb-4">
        <PrintButton label="Print Blank Scorecard" />
      </div>

      <h1 className="text-2xl font-bold uppercase">{course.name}</h1>
      <p className="mb-4 text-sm">
        {course.code} · {course.total_rounds} rounds · Target: {course.target_type}
      </p>

      {phases.map((phase) => (
        <div key={phase.id} className="mb-4">
          <h2 className="font-semibold uppercase">
            {phase.title}
            {phase.phase_total_rounds != null ? ` (${phase.phase_total_rounds} rounds)` : ""}
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left">#</th>
                <th className="border border-black px-2 py-1 text-left">Distance</th>
                <th className="border border-black px-2 py-1 text-left">Weapon</th>
                <th className="border border-black px-2 py-1 text-left">Rounds</th>
                <th className="border border-black px-2 py-1 text-left">Time</th>
                <th className="border border-black px-2 py-1 text-left">Position</th>
                <th className="border border-black px-2 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {strings
                .filter((s) => s.phase_id === phase.id)
                .map((s) => (
                  <tr key={s.id}>
                    <td className="border border-black px-2 py-1">
                      {s.string_number}
                      {s.option_label ? ` (${s.option_label})` : ""}
                    </td>
                    <td className="border border-black px-2 py-1">{s.distance}</td>
                    <td className="border border-black px-2 py-1">{s.weapon ?? "—"}</td>
                    <td className="border border-black px-2 py-1">{s.rounds ?? "—"}</td>
                    <td className="border border-black px-2 py-1">{s.time_limit ?? "—"}</td>
                    <td className="border border-black px-2 py-1">{s.position ?? "—"}</td>
                    <td className="border border-black px-2 py-1">{s.action ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2 className="mt-6 font-semibold uppercase">Scoring Card</h2>
      <div className="mb-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>Date: ______________</div>
        <div>Range / Location: ______________________________</div>
        <div>Weapon Used: ______________________________</div>
        <div>Caliber: ______________</div>
        <div>Grain: ______________</div>
        <div>Ammo Lot #: ______________</div>
        <div className="col-span-2">Weather Conditions: ______________________________</div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-left">Zone</th>
            <th className="border border-black px-2 py-1 text-left">Value</th>
            <th className="border border-black px-2 py-1 text-left">Counted</th>
            <th className="border border-black px-2 py-1 text-left">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id}>
              <td className="border border-black px-2 py-1">{z.zone_label}</td>
              <td className="border border-black px-2 py-1">{z.value}</td>
              <td className="border border-black px-2 py-1">&nbsp;</td>
              <td className="border border-black px-2 py-1">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>Rounds Fired: ____ / {course.total_rounds}</div>
        <div>Rounds Counted: ____ / {course.total_rounds}</div>
        <div>Total Points: ______________</div>
        <div>Final Score: ______________ %</div>
        <div className="col-span-2 mt-4">Grader Name: ______________________________</div>
        <div className="col-span-2">Grader Signature: ______________________________</div>
      </div>

      <p className="mt-8 text-center text-[10px] tracking-widest text-neutral-500">
        [ TAC-LOG — PRECISION SYSTEMS ]
      </p>
    </div>
  );
}
