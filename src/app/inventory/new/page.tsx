import FirearmForm from "@/components/FirearmForm";
import { createFirearm } from "@/app/inventory/actions";
import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function NewFirearmPage() {
  const db = getDb();
  const platformOptions = getDropdownOptions(db, "platform");
  const caliberOptions = getDropdownOptions(db, "caliber");
  const settings = getSettings(db);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Add Firearm</h1>
      <FirearmForm
        action={createFirearm}
        submitLabel="Add Firearm"
        platformOptions={platformOptions}
        caliberOptions={caliberOptions}
        defaultCleanRounds={settings.defaultCleanIntervalRounds}
        defaultCleanDays={settings.defaultCleanIntervalDays}
      />
    </div>
  );
}
