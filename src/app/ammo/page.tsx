import { getDb } from "@/lib/db";
import type { AmmoPurchase, AmmoGoal, AmmoOnHand } from "@/lib/db/types";
import { createAmmoPurchase, setAmmoGoal, deleteAmmoPurchase } from "./actions";
import SelectOrOther from "@/components/SelectOrOther";
import { getDropdownOptions } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

export default async function AmmoPage() {
  const db = getDb();

  const purchases = db
    .prepare(`select * from ammo_purchases order by date_purchased desc`)
    .all() as AmmoPurchase[];

  const goals = db.prepare(`select * from ammo_goals`).all() as AmmoGoal[];
  const onHand = db.prepare(`select * from ammo_on_hand`).all() as AmmoOnHand[];
  const ammoTypeOptions = getDropdownOptions(db, "ammo_type");
  const caliberOptions = getDropdownOptions(db, "caliber");

  const calibers = Array.from(
    new Set([...onHand.map((o) => o.caliber), ...goals.map((g) => g.caliber)])
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Ammo Tracking</h1>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">On Hand vs. Goal</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {calibers.map((caliber) => {
            const hand = onHand.find((o) => o.caliber === caliber);
            const goal = goals.find((g) => g.caliber === caliber);
            const onHandQty = hand?.on_hand ?? 0;
            const goalQty = goal?.goal_quantity ?? 0;
            const pct = goalQty > 0 ? Math.min(100, Math.round((onHandQty / goalQty) * 100)) : null;
            return (
              <div key={caliber} className="rounded border border-neutral-800 bg-neutral-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{caliber}</span>
                  <span className="text-sm text-neutral-400">
                    {onHandQty} / {goalQty || "—"}
                  </span>
                </div>
                {pct != null && (
                  <div className="mt-2 h-2 overflow-hidden rounded bg-neutral-800">
                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
          {calibers.length === 0 && (
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
          <label className="flex flex-col gap-1 text-sm">
            Manufacturer
            <input
              name="manufacturer"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ammo Type
            <SelectOrOther name="ammo_type" options={ammoTypeOptions} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Caliber
            <SelectOrOther name="caliber" options={caliberOptions} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grain
            <input
              type="number"
              name="grain"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Lot #
            <input name="lot_number" className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Quantity
            <input
              type="number"
              name="quantity"
              required
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price
            <input
              type="number"
              step="0.01"
              name="price"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Date Purchased
            <input
              type="date"
              name="date_purchased"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </label>
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
                  <td className="px-3 py-2">{p.price != null ? `$${p.price}` : "—"}</td>
                  <td className="px-3 py-2">
                    <form action={deleteAmmoPurchase.bind(null, p.id)}>
                      <button className="text-red-400 hover:text-red-300">Delete</button>
                    </form>
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
