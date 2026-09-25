import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { BREAKDOWNS, breakdown, goalStatus, type BreakdownKind } from "@/lib/ammo";
import { getSettings, money } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AmmoBreakdownPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in BREAKDOWNS)) notFound();
  const k = kind as BreakdownKind;
  const db = getDb();
  const settings = getSettings(db);
  const rows = breakdown(db, k);
  const goals = goalStatus(db, settings.lowAmmoPercent).filter((g) => g.ammo_type == null && g.grain == null);
  const dims = BREAKDOWNS[k].dims;
  const totals = rows.reduce(
    (t, r) => ({ purchased: t.purchased + r.purchased, fired: t.fired + r.fired, adjusted: t.adjusted + r.adjusted, on_hand: t.on_hand + r.on_hand, spent: t.spent + r.spent }),
    { purchased: 0, fired: 0, adjusted: 0, on_hand: 0, spent: 0 }
  );
  const cell = "px-3 py-2";
  const num = (n: number) => n.toLocaleString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/ammo" className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← Ammo
          </Link>
          <h1 className="text-xl font-semibold">Ammo {BREAKDOWNS[k].title}</h1>
          <p className="text-sm text-neutral-400">{num(totals.on_hand)} rounds on hand</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BREAKDOWNS) as BreakdownKind[]).map((b) => (
            <Link
              key={b}
              href={`/ammo/breakdown/${b}`}
              className={`border px-3 py-1.5 text-xs ${b === k ? "border-brand-amber text-brand-amber" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"}`}
            >
              {BREAKDOWNS[b].title}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className={cell}>Caliber</th>
              {dims.includes("manufacturer") && <th className={cell}>Brand</th>}
              {dims.includes("ammo_type") && <th className={cell}>Type</th>}
              {dims.includes("grain") && <th className={cell}>Grain</th>}
              <th className={`${cell} text-right`}>Bought</th>
              <th className={`${cell} text-right`}>Fired</th>
              <th className={`${cell} text-right`}>Corrected</th>
              <th className={`${cell} text-right`}>On Hand</th>
              {k === "caliber" && <th className={`${cell} text-right`}>Goal</th>}
              <th className={`${cell} text-right`}>Avg / Round</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const goal = k === "caliber" ? goals.find((g) => g.caliber === r.caliber) : undefined;
              return (
                <tr key={r.key} className="border-t border-neutral-800">
                  <td className={cell}>{r.caliber}</td>
                  {r.unassigned ? (
                    <td className={`${cell} text-neutral-500`} colSpan={dims.length - 1}>
                      Not specified (rounds logged without an ammo pick)
                    </td>
                  ) : (
                    <>
                      {dims.includes("manufacturer") && <td className={cell}>{r.manufacturer ?? "—"}</td>}
                      {dims.includes("ammo_type") && <td className={cell}>{r.ammo_type ?? "—"}</td>}
                      {dims.includes("grain") && <td className={cell}>{r.grain != null ? `${r.grain}gr` : "—"}</td>}
                    </>
                  )}
                  <td className={`${cell} text-right`}>{num(r.purchased)}</td>
                  <td className={`${cell} text-right`}>{num(r.fired)}</td>
                  <td className={`${cell} text-right text-neutral-400`}>{r.adjusted ? `${r.adjusted > 0 ? "+" : ""}${num(r.adjusted)}` : "—"}</td>
                  <td className={`${cell} text-right font-medium ${r.on_hand < 0 ? "text-red-300" : ""}`}>{num(r.on_hand)}</td>
                  {k === "caliber" && (
                    <td className={`${cell} text-right text-neutral-400`}>
                      {goal ? `${num(goal.goal)} · ${Math.round(goal.pct * 100)}%` : "—"}
                    </td>
                  )}
                  <td className={`${cell} text-right text-neutral-400`}>
                    {r.priced_qty > 0 ? money(Math.round((r.spent / r.priced_qty) * 1000) / 1000, settings.currencySymbol) : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-neutral-500" colSpan={10}>
                  No ammo logged yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-neutral-700 bg-neutral-900">
              <tr>
                <td className={`${cell} font-medium`} colSpan={dims.length}>
                  Total
                </td>
                <td className={`${cell} text-right`}>{num(totals.purchased)}</td>
                <td className={`${cell} text-right`}>{num(totals.fired)}</td>
                <td className={`${cell} text-right text-neutral-400`}>{totals.adjusted ? num(totals.adjusted) : "—"}</td>
                <td className={`${cell} text-right font-medium`}>{num(totals.on_hand)}</td>
                {k === "caliber" && <td className={cell}></td>}
                <td className={`${cell} text-right text-neutral-400`}>{totals.spent ? `${money(Math.round(totals.spent * 100) / 100, settings.currencySymbol)} spent` : ""}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
