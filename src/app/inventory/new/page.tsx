import FirearmForm from "@/components/FirearmForm";
import { createFirearm } from "@/app/inventory/actions";
import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { getSettings } from "@/lib/settings";
import type { Firearm } from "@/lib/db/types";
import { label } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function NewFirearmPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const db = getDb();
  const src = from ? (db.prepare(`select * from firearms where id = ?`).get(from) as Firearm | undefined) : undefined;
  const template: Firearm | undefined = src
    ? {
        ...src,
        id: "",
        nickname: null,
        serial_number: null,
        purchase_date: null,
        purchase_location: null,
        purchase_value: null,
        ffl_license_number: null,
        receipt: null,
        notes: null,
        status: "active",
        shots_fired: 0,
        malfunctions: 0,
        last_cleaned_at_shots: null,
      }
    : undefined;
  const platformOptions = getDropdownOptions(db, "platform");
  const caliberOptions = getDropdownOptions(db, "caliber");
  const settings = getSettings(db);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Add Firearm</h1>
      <p className="mb-4 text-sm text-neutral-400">
        {src ? `Copied from ${label(src)}. Enter the serial number and purchase details for this one.` : "Fill in what you know; you can add the rest later."}
      </p>
      <FirearmForm
        firearm={template}
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
