import Link from "next/link";
import { getDb } from "@/lib/db";
import type { RangeLog } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  const firearmCount = db
    .prepare(`select count(*) as n from firearms where status = 'active'`)
    .get() as { n: number };

  const activeParticipants = db
    .prepare(`select count(*) as n from participants where status = 'active'`)
    .get() as { n: number };

  const logs = db
    .prepare(
      `select rl.*, c.name as cof_name, f.make_model as firearm_make_model
       from range_log rl
       left join courses_of_fire c on c.id = rl.cof_id
       left join firearms f on f.id = rl.firearm_id
       order by rl.date desc
       limit 5`
    )
    .all() as (RangeLog & { cof_name: string | null; firearm_make_model: string | null })[];

  const groupLogs = db
    .prepare(
      `select grl.date, grl.final_score_percent, c.name as cof_name, p.name as participant_name
       from group_range_log grl
       left join courses_of_fire c on c.id = grl.cof_id
       left join participants p on p.id = grl.participant_id
       order by grl.date desc
       limit 5`
    )
    .all() as { date: string; final_score_percent: number | null; cof_name: string | null; participant_name: string | null }[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-neutral-400">
          {firearmCount.n} firearm{firearmCount.n === 1 ? "" : "s"} in the armory · {activeParticipants.n}{" "}
          active participant{activeParticipants.n === 1 ? "" : "s"} on the group roster.
        </p>
      </div>

      <form action="/search" className="flex gap-2">
        <input
          name="q"
          placeholder="Search firearms, ammo, courses, range log…"
          className="w-full max-w-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case"
        />
        <button
          type="submit"
          className="border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Search
        </button>
      </form>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-neutral-200">Recent range sessions (personal)</h2>
          <Link href="/range-log" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Link
              key={l.id}
              href={`/range-log/${l.id}`}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:border-neutral-600"
            >
              <span>
                {l.date} · {l.firearm_make_model ?? "—"} · {l.cof_name ?? "Unlisted course"}
              </span>
              <span className="text-neutral-400">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
              </span>
            </Link>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-neutral-500">No range sessions logged yet.</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-neutral-200">Recent group range days</h2>
          <Link href="/group-log" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {groupLogs.map((l, i) => (
            <div
              key={i}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
            >
              <span>
                {l.date} · {l.participant_name ?? "Unassigned"} · {l.cof_name ?? "Unlisted course"}
              </span>
              <span className="text-neutral-400">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
              </span>
            </div>
          ))}
          {groupLogs.length === 0 && (
            <p className="text-sm text-neutral-500">
              No group range days recorded yet — participants are entirely optional.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
