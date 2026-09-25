import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Firearm } from "@/lib/db/types";
import ArmoryTable from "@/components/ArmoryTable";
import { fd, label } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const db = getDb();
  const firearms = db
    .prepare(`select * from firearms order by date_of_entry desc`)
    .all() as Firearm[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Armory</h1>
        <div className="flex gap-3">
          <Link
            href="/reports/inventory"
            className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Inventory Report
          </Link>
          <Link
            href="/inventory/accessories"
            className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Accessories
          </Link>
          <Link
            href="/inventory/new"
            className="bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light"
          >
            + Add Firearm
          </Link>
        </div>
      </div>

      <ArmoryTable
        rows={firearms.map((f) => ({
          id: f.id,
          label: label(f),
          makeModel: f.make_model,
          nickname: f.nickname,
          caliber: f.caliber,
          platform: f.platform,
          serial: f.serial_number,
          status: f.status,
          shots: f.shots_fired ?? 0,
          purchaseDate: f.purchase_date,
          purchaseDateText: fd(f.purchase_date),
        }))}
      />
    </div>
  );
}
