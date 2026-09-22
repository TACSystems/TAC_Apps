import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import type { Participant, GroupRangeLog } from "@/lib/db/types";
import ParticipantForm from "@/components/ParticipantForm";
import { updateParticipant, deleteParticipant } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const participant = db.prepare(`select * from participants where id = ?`).get(id) as
    | Participant
    | undefined;
  if (!participant) notFound();

  const history = db
    .prepare(
      `select grl.*, c.name as cof_name
       from group_range_log grl
       left join courses_of_fire c on c.id = grl.cof_id
       where grl.participant_id = ?
       order by grl.date desc`
    )
    .all(id) as (GroupRangeLog & { cof_name: string | null })[];

  const updateWithId = updateParticipant.bind(null, id);
  const deleteWithId = deleteParticipant.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{participant.name}</h1>
          <div className="flex gap-2">
            <Link
              href={`/group-stats?participant=${id}`}
              className="border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
            >
              View Progress
            </Link>
            <form action={deleteWithId}>
              <ConfirmSubmitButton
                confirmMessage={`Delete ${participant.name} from the roster? Their logged group range days stay on file but will no longer show a linked participant. This cannot be undone.`}
                className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
        <div className="max-w-xl">
          <ParticipantForm participant={participant} action={updateWithId} submitLabel="Save Changes" />
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Range Day History</h2>
        <div className="flex flex-col gap-2">
          {history.map((h) => (
            <Link
              key={h.id}
              href={`/group-log/${h.id}`}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
            >
              <span>
                {h.date} · {h.cof_name ?? "Unlisted course"}
              </span>
              <span className="text-neutral-400">
                {h.final_score_percent != null ? `${h.final_score_percent}%` : "—"}
              </span>
            </Link>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-neutral-500">No group range days recorded for this participant yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
