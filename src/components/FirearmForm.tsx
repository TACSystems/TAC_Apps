import type { Firearm } from "@/lib/db/types";
import SelectOrOther from "@/components/SelectOrOther";
import SubmitButton from "@/components/SubmitButton";
import UnsavedGuard from "@/components/UnsavedGuard";

export default function FirearmForm({
  firearm,
  action,
  submitLabel,
  platformOptions,
  caliberOptions,
  defaultCleanRounds,
  defaultCleanDays,
}: {
  firearm?: Firearm;
  defaultCleanRounds?: number | null;
  defaultCleanDays?: number | null;
  action: (formData: FormData) => void;
  submitLabel: string;
  platformOptions: string[];
  caliberOptions: string[];
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UnsavedGuard />
      <label className="flex flex-col gap-1 text-sm">
        Make / Model
        <input
          name="make_model"
          required
          defaultValue={firearm?.make_model}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nickname (optional)
        <input
          name="nickname"
          defaultValue={firearm?.nickname ?? ""}
          placeholder="e.g. Duty Gun, Old Reliable"
          maxLength={60}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 normal-case"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Caliber
        <SelectOrOther name="caliber" options={caliberOptions} defaultValue={firearm?.caliber} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Platform
        <SelectOrOther
          name="platform"
          options={platformOptions}
          defaultValue={firearm?.platform}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Serial Number
        <input
          name="serial_number"
          defaultValue={firearm?.serial_number ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={firearm?.status ?? "active"}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="stored">Stored</option>
          <option value="sold">Sold</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Purchase Date
        <input
          type="date"
          name="purchase_date"
          defaultValue={firearm?.purchase_date ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Purchase Value
        <input
          type="number"
          step="0.01"
          name="purchase_value"
          defaultValue={firearm?.purchase_value ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Purchase Location
        <input
          name="purchase_location"
          defaultValue={firearm?.purchase_location ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        FFL License Number
        <input
          name="ffl_license_number"
          defaultValue={firearm?.ffl_license_number ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Receipt Reference
        <input
          name="receipt"
          defaultValue={firearm?.receipt ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Clean Every (rounds)
        <input
          type="number"
          name="clean_interval_rounds"
          defaultValue={firearm ? firearm.clean_interval_rounds ?? "" : defaultCleanRounds ?? ""}
          placeholder="e.g. 500"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Clean Every (days)
        <input
          type="number"
          name="clean_interval_days"
          defaultValue={firearm ? firearm.clean_interval_days ?? "" : defaultCleanDays ?? ""}
          placeholder="e.g. 90"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={firearm?.notes ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <SubmitButton
        className="mt-2 w-fit rounded bg-brand-olive px-4 py-2 font-medium hover:bg-brand-olive-light sm:col-span-2"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
