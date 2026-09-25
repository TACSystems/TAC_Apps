import type { Firearm } from "@/lib/db/types";
import SelectOrOther from "@core/components/SelectOrOther";
import SubmitButton from "@core/components/SubmitButton";
import UnsavedGuard from "@core/components/UnsavedGuard";
import HelpTip from "@core/components/HelpTip";

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
        <span className="req">Make / Model</span>
        <input
          name="make_model"
          required
          defaultValue={firearm?.make_model}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nickname (optional)
        <input
          name="nickname"
          defaultValue={firearm?.nickname ?? ""}
          placeholder="e.g. Duty Gun, Old Reliable"
          maxLength={60}
          className="input"
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
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={firearm?.status ?? "active"}
          className="input"
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
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Purchase Value
        <input
          type="number"
          step="0.01"
          name="purchase_value"
          defaultValue={firearm?.purchase_value ?? ""}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Purchase Location
        <input
          name="purchase_location"
          defaultValue={firearm?.purchase_location ?? ""}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        FFL License Number
        <input
          name="ffl_license_number"
          defaultValue={firearm?.ffl_license_number ?? ""}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Receipt Reference
        <input
          name="receipt"
          defaultValue={firearm?.receipt ?? ""}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>
          Clean Every (rounds) <HelpTip text="Cleaning is due after this many rounds since the last Cleaning entry. Leave blank to track by days only." />
        </span>
        <input
          type="number"
          name="clean_interval_rounds"
          defaultValue={firearm ? firearm.clean_interval_rounds ?? "" : defaultCleanRounds ?? ""}
          placeholder="e.g. 500"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>
          Clean Every (days) <HelpTip text="Cleaning is due this many days after the last Cleaning entry, even if you have not shot it (good for carry guns). Leave blank to track by rounds only." />
        </span>
        <input
          type="number"
          name="clean_interval_days"
          defaultValue={firearm ? firearm.clean_interval_days ?? "" : defaultCleanDays ?? ""}
          placeholder="e.g. 90"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={firearm?.notes ?? ""}
          className="input"
        />
      </label>

      <SubmitButton
        className="btn btn-primary mt-2 w-fit sm:col-span-2"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
