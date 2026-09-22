import { getDb } from "@/lib/db";
import type { GroupRangeLog, GroupRangeLogZoneCount } from "@/lib/db/types";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function GroupLogPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const log = db
    .prepare(
      `select grl.*, c.name as cof_name, c.code as cof_code, c.total_rounds as cof_total_rounds,
              c.target_type as cof_target_type, f.make_model as firearm_make_model, p.name as participant_name
       from group_range_log grl
       left join courses_of_fire c on c.id = grl.cof_id
       left join firearms f on f.id = grl.firearm_id
       left join participants p on p.id = grl.participant_id
       where grl.id = ?`
    )
    .get(id) as
    | (GroupRangeLog & {
        cof_name: string | null;
        cof_code: string | null;
        cof_total_rounds: number | null;
        cof_target_type: string | null;
        firearm_make_model: string | null;
        participant_name: string | null;
      })
    | undefined;

  if (!log) notFound();

  const zoneCounts = db
    .prepare(`select * from group_range_log_zone_counts where group_range_log_id = ?`)
    .all(id) as GroupRangeLogZoneCount[];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black">
      <div className="no-print mb-4">
        <PrintButton label="Print Scorecard" />
      </div>

      <h1 className="text-2xl font-bold uppercase">{log.cof_name ?? "Group Range Log"}</h1>
      <p className="mb-4 text-sm">
        {log.cof_code} · {log.cof_total_rounds} rounds · Target: {log.cof_target_type}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>Participant: {log.participant_name ?? "________________________"}</div>
        <div>Date: {log.date}</div>
        <div>Range / Location: {log.range_location ?? "________________________"}</div>
        <div>Weapon Used: {log.firearm_make_model ?? log.weapon_used ?? "________________________"}</div>
        <div>Caliber: {log.caliber ?? "________"}</div>
        <div>Grain: {log.grain ?? "________"}</div>
        <div className="col-span-2">Weather Conditions: {log.weather_conditions ?? "________________________"}</div>
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
          {zoneCounts.map((z) => (
            <tr key={z.id}>
              <td className="border border-black px-2 py-1">{z.zone_label}</td>
              <td className="border border-black px-2 py-1">{z.value}</td>
              <td className="border border-black px-2 py-1">{z.counted}</td>
              <td className="border border-black px-2 py-1">{z.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>Rounds Fired: {log.rounds_fired ?? "—"}</div>
        <div>Rounds Counted: {log.rounds_counted ?? "—"}</div>
        <div>Total Points: {log.total_points ?? "—"}</div>
        <div>Final Score: {log.final_score_percent != null ? `${log.final_score_percent}%` : "—"}</div>
        <div className="col-span-2 mt-4">
          Grader Name: {log.grader_name ?? "________________________"}
        </div>
        <div className="col-span-2">Grader Signature: ______________________________</div>
      </div>

      {log.notes && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Notes: </span>
          {log.notes}
        </p>
      )}

      <p className="mt-8 text-center text-[10px] tracking-widest text-neutral-500">
        [ TAC-LOG — PRECISION SYSTEMS ]
      </p>
    </div>
  );
}
