import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import type { AmmoPurchase } from "@/lib/db/types";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import AmmoPurchaseFields from "@/components/AmmoPurchaseFields";
import SubmitButton from "@core/components/SubmitButton";
import { updateAmmoPurchase } from "../../actions";
import UnsavedGuard from "@core/components/UnsavedGuard";

export const dynamic = "force-dynamic";

export default async function EditAmmoPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const purchase = db.prepare(`select * from ammo_purchases where id = ?`).get(id) as AmmoPurchase | undefined;
  if (!purchase) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/ammo" className="text-xs text-brand-amber hover:text-brand-amber-light">
        ← Ammo
      </Link>
      <h1 className="mb-4 text-xl font-semibold">Edit Ammo Purchase</h1>
      <form action={updateAmmoPurchase.bind(null, id)} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <UnsavedGuard />
        <AmmoPurchaseFields
          purchase={purchase}
          manufacturerOptions={getDropdownOptions(db, "ammo_manufacturer")}
          ammoTypeOptions={getDropdownOptions(db, "ammo_type")}
          caliberOptions={getDropdownOptions(db, "caliber")}
        />
        <SubmitButton className="w-fit rounded bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light sm:col-span-3">
          Save Changes
        </SubmitButton>
      </form>
    </div>
  );
}
