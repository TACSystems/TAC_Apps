import Icon from "@core/components/Icon";
import PageHeader from "@core/components/PageHeader";
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
      <PageHeader
        title="Armory"
        icon="armory"
        actions={
          <>
            <Link href="/reports/inventory" className="btn btn-secondary">
              <Icon name="print" /> Inventory Report
            </Link>
            <Link href="/inventory/accessories" className="btn btn-secondary">
              Accessories
            </Link>
            <Link href="/inventory/new" className="btn btn-primary">
              <Icon name="plus" /> Add Firearm
            </Link>
          </>
        }
      />

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
