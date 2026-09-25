import type { AmmoPurchase } from "@/lib/db/types";
import SelectOrOther from "@core/components/SelectOrOther";
import SuggestInput from "@core/components/SuggestInput";
import HelpTip from "@core/components/HelpTip";

const input = "input";

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
        <span className="req">Caliber</span>
        <SelectOrOther name="caliber" options={caliberOptions} defaultValue={purchase?.caliber} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Grain
        <input type="number" name="grain" defaultValue={purchase?.grain ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>
          Lot # <HelpTip text="The lot number printed on the box. Handy for tracing a bad batch or matching your zero to a lot." />
        </span>
        <input name="lot_number" defaultValue={purchase?.lot_number ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="req">Quantity</span>
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
