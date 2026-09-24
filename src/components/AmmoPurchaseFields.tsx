import type { AmmoPurchase } from "@/lib/db/types";
import SelectOrOther from "@/components/SelectOrOther";
import SuggestInput from "@/components/SuggestInput";

const input = "rounded border border-neutral-700 bg-neutral-900 px-3 py-2";

export default function AmmoPurchaseFields({
  purchase,
  manufacturerOptions,
  ammoTypeOptions,
  caliberOptions,
  defaultManufacturer,
  defaultType,
}: {
  defaultManufacturer?: string;
  defaultType?: string;
  purchase?: AmmoPurchase;
  manufacturerOptions: string[];
  ammoTypeOptions: string[];
  caliberOptions: string[];
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Manufacturer
        <SuggestInput
          name="manufacturer"
          listId="ammo-manufacturers"
          options={manufacturerOptions}
          defaultValue={purchase ? purchase.manufacturer : defaultManufacturer || undefined}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ammo Type
        <SelectOrOther name="ammo_type" options={ammoTypeOptions} defaultValue={purchase ? purchase.ammo_type : defaultType || undefined} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Caliber
        <SelectOrOther name="caliber" options={caliberOptions} defaultValue={purchase?.caliber} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Grain
        <input type="number" name="grain" defaultValue={purchase?.grain ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Lot #
        <input name="lot_number" defaultValue={purchase?.lot_number ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Quantity
        <input type="number" name="quantity" required defaultValue={purchase?.quantity ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Price (total)
        <input type="number" step="0.01" name="price" defaultValue={purchase?.price ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Date Purchased
        <input type="date" name="date_purchased" defaultValue={purchase?.date_purchased ?? ""} className={input} />
      </label>
    </>
  );
}
