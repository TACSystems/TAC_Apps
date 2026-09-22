import { getDb } from "@/lib/db";
import type { AmmoPurchase } from "@/lib/db/types";
import { createAmmoPurchase, setAmmoGoal, deleteAmmoPurchase, deleteAmmoGoal } from "./actions";
import SelectOrOther from "@/components/SelectOrOther";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { getSettings, money } from "@/lib/settings";
import { ammoStatus } from "@/lib/ammo";
import AmmoPurchaseFields from "@/components/AmmoPurchaseFields";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AmmoPage() {
  const db = getDb();

  const purchases = db
    .prepare(`select * from ammo_purchases order by date_purchased desc`)
    .all() as AmmoPurchase[];

  const ammoTypeOptions = getDropdownOptions(db, "ammo_type");
  const caliberOptions = getDropdownOptions(db, "caliber");
  const manufacturerOptions = getDropdownOptions(db, "ammo_manufacturer");
  const settings = getSettings(db);
  const status = ammoStatus(db, settings.lowAmmoPercent);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Ammo Tracking</h1>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">On Hand vs. Goal</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {status.map((a) => {
            const pct = a.pct != null ? Math.min(100, Math.max(0, Math.round(a.pct * 100))) : null;
            return (
              <div
                key={a.caliber}
                className={`rounded border bg-neutral-900 p-4 ${a.low ? "border-red-900" : "border-neutral-800"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.caliber}</span>
                  <span className={`text-sm ${a.low ? "text-red-300" : "text-neutral-400"}`}>
                    {a.on_hand.toLocaleString()} / {a.goal ? a.goal.toLocaleString() : "—"}
                    {a.low ? " · LOW" : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {a.purchased.toLocaleString()} purchased · {a.fired.toLocaleString()} fired
                </div>
                {pct != null && (
                  <div className="mt-2 h-2 overflow-hidden rounded bg-neutral-800">
                    <div className={`h-full ${a.low ? "bg-red-600" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                {a.goal != null && (
                  <form action={deleteAmmoGoal.bind(null, a.caliber)} className="mt-2">
                    <ConfirmSubmitButton
                      confirmMessage={`Remove the ${a.caliber} goal? Your purchases and on-hand count aren't affected.`}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove goal
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>
            );
          })}
          {status.length === 0 && (
            <p className="text-sm text-neutral-500">No ammo purchases or goals logged yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Set a Goal</h2>
        <form action={setAmmoGoal} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Caliber
            <SelectOrOther name="caliber" options={caliberOptions} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Goal Quantity
            <input
              type="number"
              name="goal_quantity"
              required
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Save Goal
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Log a Purchase</h2>
        <form action={createAmmoPurchase} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AmmoPurchaseFields
            manufacturerOptions={manufacturerOptions}
            ammoTypeOptions={ammoTypeOptions}
            caliberOptions={caliberOptions}
          />
          <button
            type="submit"
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 sm:col-span-3"
          >
            Log Purchase
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Purchase History</h2>
        <div className="overflow-x-auto rounded border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Caliber</th>
                <th className="px-3 py-2">Manufacturer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Lot #</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Per Round</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{p.date_purchased}</td>
                  <td className="px-3 py-2">{p.caliber}</td>
                  <td className="px-3 py-2">{p.manufacturer}</td>
                  <td className="px-3 py-2">{p.ammo_type}</td>
                  <td className="px-3 py-2 text-neutral-400">{p.lot_number ?? "—"}</td>
                  <td className="px-3 py-2">{p.quantity}</td>
                  <td className="px-3 py-2">{p.price != null ? money(p.price, settings.currencySymbol) : "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">
                    {p.price != null && p.quantity > 0
                      ? money(Math.round((p.price / p.quantity) * 1000) / 1000, settings.currencySymbol)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <Link href={`/ammo/purchases/${p.id}`} className="text-blue-400 hover:text-blue-300">
                        Edit
                      </Link>
                      <form action={deleteAmmoPurchase.bind(null, p.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Delete this purchase of ${p.quantity} rounds of ${p.caliber}? It's removed from ammo on hand.`}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">No purchases logged yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
