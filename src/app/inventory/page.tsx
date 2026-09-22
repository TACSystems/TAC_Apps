import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Firearm } from "@/lib/db/types";
import StatusBadge from "@/components/StatusBadge";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const db = getDb();
  const firearms = db
    .prepare(`select * from firearms order by date_of_entry desc`)
    .all() as Firearm[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Armory</h1>
        <div className="flex gap-3">
          <Link
            href="/inventory/accessories"
            className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Accessories
          </Link>
          <Link
            href="/inventory/new"
            className="bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
          >
            + Add Firearm
          </Link>
        </div>
      </div>

      <SearchBox
        placeholder="Search by make/model, caliber, platform, or serial…"
        emptyMessage="No firearms found."
        head={
          <tr>
            <th className="px-3 py-2">Make / Model</th>
            <th className="px-3 py-2">Caliber</th>
            <th className="px-3 py-2">Platform</th>
            <th className="px-3 py-2">Serial</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Rounds Fired</th>
          </tr>
        }
        rows={firearms.map((f) => ({
          key: f.id,
          text: `${f.make_model} ${f.caliber ?? ""} ${f.platform ?? ""} ${f.serial_number ?? ""}`,
          row: (
            <tr key={f.id} className="border-t border-neutral-800 hover:bg-neutral-900">
              <td className="px-3 py-2">
                <Link href={`/inventory/${f.id}`} className="text-blue-400 hover:text-blue-300">
                  {f.make_model}
                </Link>
              </td>
              <td className="px-3 py-2">{f.caliber}</td>
              <td className="px-3 py-2">{f.platform}</td>
              <td className="px-3 py-2 text-neutral-400">{f.serial_number}</td>
              <td className="px-3 py-2">
                <StatusBadge status={f.status} />
              </td>
              <td className="px-3 py-2">{f.shots_fired}</td>
            </tr>
          ),
        }))}
      />
    </div>
  );
}
