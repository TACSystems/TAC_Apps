import { getDb } from "@/lib/db";
import type { RangeLog, RangeLogZoneCount } from "@/lib/db/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteRangeLog } from "../actions";
import { costPerRound } from "@/lib/stats";
import { getSettings, money } from "@/lib/settings";
import { passFail } from "@/lib/cof-shared";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function RangeLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const log = db
    .prepare(
      `select rl.*, c.name as cof_name, firearm_label(f.make_model, f.nickname) as firearm_make_model
       from range_log rl
       left join courses_of_fire c on c.id = rl.cof_id
       left join firearms f on f.id = rl.firearm_id
       where rl.id = ?`
    )
    .get(id) as
    | (RangeLog & {
        cof_name: string | null;
        firearm_make_model: string | null;
      })
    | undefined;

  if (!log) notFound();

  const result = passFail(log.final_score_percent, log.passing_score_percent);
  const cpr = costPerRound(db, log.caliber);
  const ammoCost = cpr != null && log.rounds_fired ? money(Math.round(cpr * log.rounds_fired * 100) / 100, getSettings(db).currencySymbol) : null;

  const zoneCounts = db
    .prepare(`select * from range_log_zone_counts where range_log_id = ?`)
    .all(id) as RangeLogZoneCount[];

  return (
    <div className="max-w-xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {log.cof_name ?? "Range Log"} — {fd(log.date)}
        </h1>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/range-log/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Print Scorecard
          </a>
          <Link href={`/range-log/${id}/edit`} className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
            Edit
          </Link>
          <form action={deleteRangeLog.bind(null, id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete this range session?${
                log.rounds_fired ? ` Its ${log.rounds_fired} rounds are taken off the firearm's shot count and returned to ammo on hand.` : ""
              } This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
      <p className="mb-4 text-sm text-neutral-400">
        {log.firearm_make_model ?? "No firearm linked"} · {log.range_location}
        {log.ammo_lot ? ` · Lot ${log.ammo_lot}` : ""}
        {ammoCost ? ` · est. ammo cost ${ammoCost}` : ""}
      </p>

      <div className="mb-4 grid grid-cols-3 gap-4 border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <div>
          <div className="text-neutral-500">Rounds Counted</div>
          <div className="text-lg">{log.rounds_counted}</div>
        </div>
        <div>
          <div className="text-neutral-500">Total Points</div>
          <div className="text-lg">{log.total_points}</div>
        </div>
        <div>
          <div className="text-neutral-500">Final Score</div>
          <div className="text-lg">
            {log.final_score_percent != null ? `${log.final_score_percent}%` : "—"}
            {result && (
              <span className={`ml-2 text-sm ${result === "PASS" ? "text-green-400" : "text-red-400"}`}>
                {result}
              </span>
            )}
          </div>
          {log.passing_score_percent != null && (
            <div className="text-xs text-neutral-500">Passing: {log.passing_score_percent}%</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Counted</th>
              <th className="px-3 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {zoneCounts.map((z) => (
              <tr key={z.id} className="border-t border-neutral-800">
                <td className="px-3 py-2">{z.zone_label}</td>
                <td className="px-3 py-2">{z.value}</td>
                <td className="px-3 py-2">{z.counted}</td>
                <td className="px-3 py-2">{z.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {log.notes && (
        <p className="mt-4 text-sm text-neutral-400">
          <span className="text-neutral-500">Notes: </span>
          {log.notes}
        </p>
      )}
    </div>
  );
}
