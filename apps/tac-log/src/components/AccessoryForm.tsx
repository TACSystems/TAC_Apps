import type { Accessory, Firearm } from "@/lib/db/types";
import SelectOrOther from "@core/components/SelectOrOther";
import SubmitButton from "@core/components/SubmitButton";
import UnsavedGuard from "@core/components/UnsavedGuard";
import { todayISO } from "@/lib/settings-shared";

const input = "input";

export default function AccessoryForm({
  accessory,
  firearms,
  typeOptions,
  platformOptions,
  defaultFirearmId,
  action,
  submitLabel,
}: {
  accessory?: Accessory;
  firearms: Pick<Firearm, "id" | "make_model" | "status" | "label">[];
  typeOptions: string[];
  platformOptions: string[];
  defaultFirearmId?: string | null;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UnsavedGuard />
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="req">Make / Model</span>
        <input name="make_model" required defaultValue={accessory?.make_model} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <SelectOrOther name="type" options={typeOptions} defaultValue={accessory?.type} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Platform
        <SelectOrOther name="platform" options={platformOptions} defaultValue={accessory?.platform} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Serial Number
        <input name="serial_number" defaultValue={accessory?.serial_number ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mounted On
        <select name="firearm_id" defaultValue={accessory ? accessory.firearm_id ?? "" : defaultFirearmId ?? ""} className={input}>
          <option value="">— Not mounted —</option>
          {firearms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label ?? f.make_model}
              {f.status === "sold" ? " (sold)" : ""}
            </option>
          ))}
        </select>
      </label>
      {accessory && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            If moved: date moved
            <input
              type="date"
              name="move_date"
              defaultValue={todayISO()}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            If moved: note
            <input name="move_note" placeholder="Optional, e.g. re-zeroed" className={input} />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Acquisition Date
        <input type="date" name="acquisition_date" defaultValue={accessory?.acquisition_date ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Purchase Value
        <input
          type="number"
          step="0.01"
          name="purchase_value"
          defaultValue={accessory?.purchase_value ?? ""}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Purchase Location
        <input name="purchase_location" defaultValue={accessory?.purchase_location ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Receipt Reference
        <input name="receipt" defaultValue={accessory?.receipt ?? ""} placeholder="Order #, invoice #" className={input} />
      </label>
      <SubmitButton pendingLabel="Saving…" className="btn btn-primary mt-2 w-fit">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
