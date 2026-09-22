import { getDb } from "@/lib/db";
import { createAccessory } from "@/app/inventory/actions";
import type { Firearm } from "@/lib/db/types";
import SelectOrOther from "@/components/SelectOrOther";
import { getDropdownOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function NewAccessoryPage({
  searchParams,
}: {
  searchParams: Promise<{ firearm_id?: string }>;
}) {
  const { firearm_id } = await searchParams;
  const db = getDb();
  const firearms = db.prepare(`select * from firearms order by make_model`).all() as Firearm[];
  const typeOptions = getDropdownOptions(db, "accessory_type");
  const platformOptions = getDropdownOptions(db, "platform");

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">Add Accessory</h1>
      <form action={createAccessory} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Make / Model
          <input
            name="make_model"
            required
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <SelectOrOther name="type" options={typeOptions} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Platform
          <SelectOrOther name="platform" options={platformOptions} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Serial Number
          <input
            name="serial_number"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Linked Firearm
          <select
            name="firearm_id"
            defaultValue={firearm_id ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">— None —</option>
            {firearms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.make_model}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Acquisition Date
          <input
            type="date"
            name="acquisition_date"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Purchase Value
          <input
            type="number"
            step="0.01"
            name="purchase_value"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Purchase Location
          <input
            name="purchase_location"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Receipt Reference
          <input name="receipt" className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        </label>
        <button
          type="submit"
          className="mt-2 w-fit rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
        >
          Add Accessory
        </button>
      </form>
    </div>
  );
}
