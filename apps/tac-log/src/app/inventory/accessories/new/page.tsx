import Link from "next/link";
import { getDb } from "@/lib/db";
import { createAccessory } from "@/app/inventory/actions";
import type { Firearm } from "@/lib/db/types";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import AccessoryForm from "@/components/AccessoryForm";

export const dynamic = "force-dynamic";

export default async function NewAccessoryPage({ searchParams }: { searchParams: Promise<{ firearm_id?: string }> }) {
  const { firearm_id } = await searchParams;
  const db = getDb();
  const firearms = db
    .prepare(`select id, make_model, nickname, status, firearm_label(make_model, nickname) as label from firearms order by make_model`)
    .all() as Pick<Firearm, "id" | "make_model" | "status" | "label">[];

  return (
    <div className="max-w-4xl">
      <Link href="/inventory/accessories" className="text-xs text-brand-amber hover:text-brand-amber-light">
        ← Accessories
      </Link>
      <h1 className="mb-1 text-xl font-semibold">Add Accessory</h1>
      <p className="mb-4 text-sm text-neutral-400">You can add receipts and photos on the next screen.</p>
      <AccessoryForm
        firearms={firearms}
        typeOptions={getDropdownOptions(db, "accessory_type")}
        platformOptions={getDropdownOptions(db, "platform")}
        defaultFirearmId={firearm_id}
        action={createAccessory}
        submitLabel="Add Accessory"
      />
    </div>
  );
}
