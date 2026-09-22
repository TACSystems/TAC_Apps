import Link from "next/link";
import { getDb } from "@/lib/db";
import type { GroupRangeLog } from "@/lib/db/types";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function GroupLogPage() {
  const db = getDb();
  const logs = db
    .prepare(
      `select grl.*, c.name as cof_name, p.name as participant_name
       from group_range_log grl
       left join courses_of_fire c on c.id = grl.cof_id
       left join participants p on p.id = grl.participant_id
       order by grl.date desc`
    )
    .all() as (GroupRangeLog & { cof_name: string | null; participant_name: string | null })[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Group Range Log</h1>
      <SearchBox
        placeholder="Search by participant, course, or date…"
        emptyMessage="No group range day entries found."
        head={
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Participant</th>
            <th className="px-3 py-2">Course</th>
            <th className="px-3 py-2">Score</th>
          </tr>
        }
        rows={logs.map((l) => ({
          key: l.id,
          text: `${l.participant_name ?? ""} ${l.cof_name ?? ""} ${l.date}`,
          row: (
            <tr key={l.id} className="border-t border-neutral-800 hover:bg-neutral-900">
              <td className="px-3 py-2">
                <Link href={`/group-log/${l.id}`} className="text-blue-400 hover:text-blue-300">
                  {l.date}
                </Link>
              </td>
              <td className="px-3 py-2">{l.participant_name ?? "—"}</td>
              <td className="px-3 py-2">{l.cof_name ?? "—"}</td>
              <td className="px-3 py-2">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
              </td>
            </tr>
          ),
        }))}
      />
    </div>
  );
}
