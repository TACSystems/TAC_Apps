import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Participant } from "@/lib/db/types";
import SearchBox from "@/components/SearchBox";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  const db = getDb();
  const participants = db.prepare(`select * from participants order by name`).all() as Participant[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Participants</h1>
          <p className="text-sm text-neutral-400">
            An optional roster for group range days — kept separate from your own armory.
          </p>
        </div>
        <Link
          href="/participants/new"
          className="bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
        >
          + Add Participant
        </Link>
      </div>

      <SearchBox
        placeholder="Search participants by name, email, or phone…"
        emptyMessage="No participants found."
        head={
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Added</th>
          </tr>
        }
        rows={participants.map((p) => ({
          key: p.id,
          text: `${p.name} ${p.email ?? ""} ${p.phone ?? ""}`,
          row: (
            <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-900">
              <td className="px-3 py-2">
                <Link href={`/participants/${p.id}`} className="text-blue-400 hover:text-blue-300">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-neutral-400">{p.email}</td>
              <td className="px-3 py-2 text-neutral-400">{p.phone}</td>
              <td className="px-3 py-2">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-3 py-2 text-neutral-500">{p.date_added?.slice(0, 10)}</td>
            </tr>
          ),
        }))}
      />
    </div>
  );
}
