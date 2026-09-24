import { passFail } from "@/lib/cof-shared";
import Link from "next/link";
import { getDb } from "@/lib/db";
import type { RangeLog } from "@/lib/db/types";
import SearchBox from "@/components/SearchBox";
import { fd } from "@/lib/display";
import ClickRow from "@/components/ClickRow";

export const dynamic = "force-dynamic";

export default async function RangeLogPage() {
  const db = getDb();
  const logs = db
    .prepare(
      `select rl.*, c.name as cof_name, firearm_label(f.make_model, f.nickname) as firearm_make_model
       from range_log rl
       left join courses_of_fire c on c.id = rl.cof_id
       left join firearms f on f.id = rl.firearm_id
       order by rl.date desc`
    )
    .all() as (RangeLog & { cof_name: string | null; firearm_make_model: string | null })[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Range Log</h1>
        <Link href="/range-log/new" className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">
          Log a Range Session
        </Link>
      </div>
      <SearchBox
        placeholder="Search by course, firearm, or date…"
        emptyMessage="No range log entries found."
        head={
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Course</th>
            <th className="px-3 py-2">Firearm</th>
            <th className="px-3 py-2">Score</th>
          </tr>
        }
        rows={logs.map((l) => ({
          key: l.id,
          text: `${l.cof_name ?? ""} ${l.firearm_make_model ?? ""} ${l.date} ${fd(l.date)}`,
          row: (
            <ClickRow key={l.id} href={`/range-log/${l.id}`} className="border-t border-neutral-800 hover:bg-neutral-900">
              <td className="px-3 py-2">
                <Link href={`/range-log/${l.id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {fd(l.date)}
                </Link>
              </td>
              <td className="px-3 py-2">{l.cof_name ?? "—"}</td>
              <td className="px-3 py-2">{l.firearm_make_model ?? "—"}</td>
              <td className="px-3 py-2">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
                {passFail(l.final_score_percent, l.passing_score_percent) && (
                  <span
                    className={`ml-2 text-xs ${
                      passFail(l.final_score_percent, l.passing_score_percent) === "PASS" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {passFail(l.final_score_percent, l.passing_score_percent)}
                  </span>
                )}
              </td>
            </ClickRow>
          ),
        }))}
      />
    </div>
  );
}
