import FirearmForm from "@/components/FirearmForm";
import { createFirearm } from "@/app/inventory/actions";
import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default function NewFirearmPage() {
  const db = getDb();
  const platformOptions = getDropdownOptions(db, "platform");
  const caliberOptions = getDropdownOptions(db, "caliber");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Add Firearm</h1>
      <FirearmForm
        action={createFirearm}
        submitLabel="Add Firearm"
        platformOptions={platformOptions}
        caliberOptions={caliberOptions}
      />
    </div>
  );
}
