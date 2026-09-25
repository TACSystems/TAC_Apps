import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import type { AmmoPurchase } from "@/lib/db/types";
import { createAmmoPurchase, setAmmoGoal, deleteAmmoPurchase, deleteAmmoGoal } from "./actions";
import SelectOrOther from "@core/components/SelectOrOther";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { getSettings, money } from "@/lib/settings";
import { breakdown, goalStatus, isUnassigned, lineLabel, stockLines, type StockLine } from "@/lib/ammo";
import AmmoPurchaseFields from "@/components/AmmoPurchaseFields";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import Link from "next/link";
import { fd } from "@/lib/display";
import CountCorrector from "@core/components/CountCorrector";
import { ammoAdjustments } from "@/lib/counts";
import { correctAmmoLineAction, removeAdjustment } from "@/app/counts/actions";
import DataTable from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import ModalButton from "@core/components/ModalButton";
import ToastOnLoad from "@core/components/ToastOnLoad";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import { pageSections } from "@core/lib/page-sections";
import SubmitButton from "@core/components/SubmitButton";
import HelpTip from "@core/components/HelpTip";

export const dynamic = "force-dynamic";

const inputCls = "rounded border border-neutral-700 bg-neutral-900 px-3 py-2";

type Line = { type: string | null; grain: number | null; total: number; brands: StockLine[] };
type Group = { caliber: string; total: number; lines: Line[]; unassigned: StockLine | null };

function groupLines(lines: StockLine[]): Group[] {
  const out: Group[] = [];
  for (const l of lines) {
    let g = out.find((x) => x.caliber === l.caliber);
    if (!g) {
      g = { caliber: l.caliber, total: 0, lines: [], unassigned: null };
      out.push(g);
    }
    g.total += l.on_hand;
    if (isUnassigned(l) && l.purchased === 0) {
      g.unassigned = l;
      continue;
    }
    let line = g.lines.find((x) => (x.type ?? "").toLowerCase() === (l.ammo_type ?? "").toLowerCase() && x.grain === l.grain);
    if (!line) {
      line = { type: l.ammo_type, grain: l.grain, total: 0, brands: [] };
      g.lines.push(line);
    }
    line.total += l.on_hand;
    line.brands.push(l);
  }
  return out;
}

export default async function AmmoPage({ searchParams }: { searchParams: Promise<{ done?: string; open?: string }> }) {
  const sp = await searchParams;
  const db = getDb();

  const purchases = db
    .prepare(`select * from ammo_purchases order by date_purchased desc`)
    .all() as AmmoPurchase[];

  const ammoTypeOptions = getDropdownOptions(db, "ammo_type");
  const caliberOptions = getDropdownOptions(db, "caliber");
  const manufacturerOptions = getDropdownOptions(db, "ammo_manufacturer");
  const settings = getSettings(db);
  const goals = goalStatus(db, settings.lowAmmoPercent);
  const groups = groupLines(stockLines(db));
  const byCaliber = breakdown(db, "caliber");
  const byBrand = breakdown(db, "brand").filter((r) => !r.unassigned);
  const adjustments = ammoAdjustments(db);
  const open = pageSections(db, "ammo");
  const total = byCaliber.reduce((s, r) => s + r.on_hand, 0);
  const done = sp.done ?? "";

  return (
    <div data-scope="ammo" className="flex flex-col gap-5">
      {done.startsWith("purchase") && <ToastOnLoad text="Purchase logged." />}
      {done.startsWith("goal") && <ToastOnLoad text="Goal saved." />}
      <PageHeader
        title="Ammo"
        icon="ammo"
        subtitle={`${total.toLocaleString()} rounds on hand`}
        actions={
        <div key={done} className="flex flex-wrap gap-2">
          <ModalButton label="Set Goal" title="Set a Goal" initialOpen={sp.open === "goal"}>
            <form action={setAmmoGoal} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="req">Caliber</span>
                <SelectOrOther name="caliber" options={caliberOptions} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="req">Goal Quantity</span>
                <input type="number" name="goal_quantity" min={1} required className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>
                  Ammo Type <HelpTip text="Optional. Leave blank for a goal that counts every type of this caliber." />
                </span>
                <SelectOrOther name="ammo_type" options={ammoTypeOptions} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>
                  Grain <HelpTip text="Optional. Narrows the goal to one bullet weight, e.g. 124." />
                </span>
                <input type="number" name="grain" min={1} className={inputCls} />
              </label>
              <p className="text-xs text-neutral-500 sm:col-span-2">
                Setting a goal that already exists (same caliber, type and grain) updates its quantity.
              </p>
              <SubmitButton className="btn btn-primary w-fit">Save Goal</SubmitButton>
            </form>
          </ModalButton>
          <ModalButton label="Log Purchase" title="Log a Purchase" primary wide initialOpen={sp.open === "purchase"}>
            <form action={createAmmoPurchase} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AmmoPurchaseFields
                defaultManufacturer={settings.defaultAmmoManufacturer}
                defaultType={settings.defaultAmmoType}
                manufacturerOptions={manufacturerOptions}
                ammoTypeOptions={ammoTypeOptions}
                caliberOptions={caliberOptions}
              />
              <SubmitButton className="btn btn-primary w-fit sm:col-span-3">
                Log Purchase
              </SubmitButton>
            </form>
          </ModalButton>
        </div>
        }
      />

      {goals.length > 0 && (
        <section aria-label="Goals" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.min(100, Math.max(0, Math.round(g.pct * 100)));
            return (
              <div key={g.id} data-goal={g.label} className={`border bg-neutral-900 px-3 py-2 ${g.low ? "border-red-900" : "border-neutral-800"}`}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{g.label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs ${g.low ? "text-red-300" : "text-neutral-400"}`}>
                      {g.on_hand.toLocaleString()} / {g.goal.toLocaleString()} · {Math.round(g.pct * 100)}%{g.low ? " · LOW" : ""}
                    </span>
                    <form action={deleteAmmoGoal.bind(null, g.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Remove the ${g.label} goal? Your purchases and on-hand count aren't affected.`}
                        className="text-xs text-neutral-500 hover:text-red-300"
                      >
                        ✕
                      </ConfirmSubmitButton>
                    </form>
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full bg-neutral-800">
                  <div className={`h-1 ${g.low ? "bg-red-500" : "bg-brand-amber"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {byCaliber.length === 0 ? (
        <EmptyState title="No ammo tracked yet">
          Use Log Purchase to add what you have, and Set Goal to keep a target (e.g. 1,000 rounds of 9mm). Rounds you fire
          come off what&apos;s on hand automatically.
        </EmptyState>
      ) : (
        <section aria-label="Totals" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link href="/ammo/breakdown/caliber" className="group block border border-neutral-800 bg-neutral-900 p-4 hover:border-brand-amber">
            <div className="mb-2 flex items-center justify-between text-xs tracking-[0.15em] text-brand-amber">
              <span>BY CALIBER</span>
              <span className="text-neutral-500 group-hover:text-brand-amber">Full list →</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {byCaliber.slice(0, 6).map((r) => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span>{r.caliber}</span>
                  <span className={r.on_hand < 0 ? "text-red-300" : ""}>{r.on_hand.toLocaleString()}</span>
                </div>
              ))}
              {byCaliber.length > 6 && <div className="text-xs text-neutral-500">+{byCaliber.length - 6} more</div>}
            </div>
          </Link>
          <Link href="/ammo/breakdown/brand" className="group block border border-neutral-800 bg-neutral-900 p-4 hover:border-brand-amber">
            <div className="mb-2 flex items-center justify-between text-xs tracking-[0.15em] text-brand-amber">
              <span>BY CALIBER · BRAND · GRAIN</span>
              <span className="text-neutral-500 group-hover:text-brand-amber">Full list →</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {byBrand.slice(0, 6).map((r) => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span className="truncate">
                    {r.caliber} · {r.manufacturer ?? "No brand"}
                    {r.grain != null ? ` · ${r.grain}gr` : ""}
                  </span>
                  <span className={r.on_hand < 0 ? "text-red-300" : ""}>{r.on_hand.toLocaleString()}</span>
                </div>
              ))}
              {byBrand.length > 6 && <div className="text-xs text-neutral-500">+{byBrand.length - 6} more</div>}
              {byBrand.length === 0 && <div className="text-xs text-neutral-500">No purchases logged yet.</div>}
            </div>
          </Link>
        </section>
      )}

      <SectionTools scope="ammo" remember />

      <Collapsible
        id="on-hand"
        scope="ammo"
        title="On Hand"
        defaultOpen={open("on-hand", true)}
        summary={groups.map((g) => `${g.caliber} ${g.total.toLocaleString()}`).join(" · ") || "Nothing yet"}
      >
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.caliber} data-caliber={g.caliber}>
              <div className="mb-1 flex items-baseline justify-between border-b border-neutral-800 pb-1">
                <span className="font-medium text-brand-amber">{g.caliber}</span>
                <span className="text-sm">{g.total.toLocaleString()} rounds</span>
              </div>
              <div className="flex flex-col">
                {g.lines.map((l) => (
                  <details key={`${l.type}-${l.grain}`} data-line={lineLabel({ ammo_type: l.type, grain: l.grain })} className="group/line border-b border-neutral-800/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-1.5 text-sm hover:bg-neutral-800/40 [&::-webkit-details-marker]:hidden">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="inline-block w-3 text-xs text-neutral-500 transition-transform group-open/line:rotate-90">▸</span>
                        <span>{lineLabel({ ammo_type: l.type, grain: l.grain })}</span>
                        <span className="text-xs text-neutral-500">
                          {l.brands.map((b) => `${b.manufacturer ?? "No brand"} ${b.on_hand.toLocaleString()}`).join(" · ")}
                        </span>
                      </span>
                      <span data-total className={l.total < 0 ? "text-red-300" : ""}>{l.total.toLocaleString()}</span>
                    </summary>
                    <div className="mb-2 ml-6 flex flex-col gap-1">
                      {l.brands.map((b) => (
                        <div key={b.manufacturer ?? "none"} data-brand={b.manufacturer ?? "No brand"} className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm">
                          <span>
                            {b.manufacturer ?? "No brand"}
                            <span className="text-xs text-neutral-500">
                              {" "}
                              · {b.purchased.toLocaleString()} bought · {b.fired.toLocaleString()} fired
                              {b.adjusted ? ` · ${b.adjusted > 0 ? "+" : ""}${b.adjusted.toLocaleString()} corrected` : ""}
                            </span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span>{b.on_hand.toLocaleString()}</span>
                            <CountCorrector
                              current={b.on_hand}
                              help={`Enter what you actually have of ${[b.caliber, lineLabel(b), b.manufacturer].filter(Boolean).join(" · ")}. TAC-LOG records the difference as a correction; purchases and range sessions stay as they are.`}
                              save={correctAmmoLineAction.bind(null, {
                                caliber: b.caliber,
                                ammo_type: b.ammo_type,
                                grain: b.grain,
                                manufacturer: b.manufacturer,
                              })}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
                {g.unassigned && g.unassigned.on_hand !== 0 && (
                  <div data-line="Not specified" className="flex items-center justify-between gap-3 px-1 py-1.5 text-sm">
                    <span className="flex items-center gap-2 pl-5">
                      <span className="text-neutral-400">Not specified</span>
                      <HelpTip text="Rounds fired or corrected without picking which ammo was used (for example, entries from before 0.8.0). They come off this caliber's total but not off a specific type or brand." />
                    </span>
                    <span className="text-neutral-400">{g.unassigned.on_hand.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-neutral-500">Nothing on hand yet.</p>}
        </div>
      </Collapsible>

      {adjustments.length > 0 && (
        <Collapsible
          id="corrections"
          scope="ammo"
          title="Count Corrections"
          defaultOpen={open("corrections", false)}
          summary={`${adjustments.length} · last ${fd(adjustments[0].date)}`}
        >
          <div className="flex flex-col gap-1">
            {adjustments.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border border-dashed border-neutral-700 px-3 py-1.5 text-sm">
                <span>
                  {fd(c.date)} · {[c.caliber, c.ammo_type, c.grain != null ? `${c.grain}gr` : null, c.manufacturer].filter(Boolean).join(" · ")}{" "}
                  set to {c.set_to?.toLocaleString() ?? "?"} ({c.delta >= 0 ? "+" : ""}
                  {c.delta.toLocaleString()})
                  {c.note ? <span className="text-neutral-500"> · {c.note}</span> : null}
                </span>
                <form action={removeAdjustment.bind(null, c.id)}>
                  <ConfirmSubmitButton confirmMessage="Remove this correction? The on-hand count goes back to what it was." className="btn-link btn-link-danger text-xs">
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      <Collapsible
        id="purchases"
        scope="ammo"
        title="Purchase History"
        defaultOpen={open("purchases", false)}
        summary={purchases.length ? `${purchases.length} purchase${purchases.length === 1 ? "" : "s"} · last ${fd(purchases[0].date_purchased)}` : "None yet"}
      >
        <DataTable
          filterPlaceholder="Filter purchases by caliber, brand, type, or lot…"
          emptyMessage="No purchases logged yet."
          initialSort={{ key: "date", dir: "desc" }}
          columns={[
            { key: "date", label: "Date", sortable: true },
            { key: "caliber", label: "Caliber", sortable: true },
            { key: "manufacturer", label: "Manufacturer", sortable: true },
            { key: "type", label: "Type", sortable: true },
            { key: "grain", label: "Grain", align: "right", sortable: true },
            { key: "lot", label: "Lot #" },
            { key: "qty", label: "Qty", align: "right", sortable: true },
            { key: "price", label: "Price", align: "right", sortable: true },
            { key: "per", label: "Per Round", align: "right", sortable: true },
            { key: "actions", label: "" },
          ]}
          rows={purchases.map((p) => ({
            key: p.id,
            href: `/ammo/purchases/${p.id}`,
            text: `${p.caliber} ${p.manufacturer ?? ""} ${p.ammo_type ?? ""} ${p.grain ?? ""} ${p.lot_number ?? ""} ${p.date_purchased ?? ""}`,
            sort: {
              date: p.date_purchased,
              caliber: p.caliber,
              manufacturer: p.manufacturer,
              type: p.ammo_type,
              grain: p.grain,
              qty: p.quantity,
              price: p.price,
              per: p.price != null && p.quantity > 0 ? p.price / p.quantity : null,
            },
            cells: {
              date: fd(p.date_purchased) || "—",
              caliber: p.caliber,
              manufacturer: p.manufacturer ?? "—",
              type: p.ammo_type ?? "—",
              grain: p.grain ?? "—",
              lot: <span className="text-neutral-400">{p.lot_number ?? "—"}</span>,
              qty: p.quantity.toLocaleString(),
              price: p.price != null ? money(p.price, settings.currencySymbol) : "—",
              per: (
                <span className="text-neutral-400">
                  {p.price != null && p.quantity > 0 ? money(Math.round((p.price / p.quantity) * 1000) / 1000, settings.currencySymbol) : "—"}
                </span>
              ),
              actions: (
                <div className="flex justify-end gap-3">
                  <Link href={`/ammo/purchases/${p.id}`} className="btn-link text-xs">
                    Edit
                  </Link>
                  <form action={deleteAmmoPurchase.bind(null, p.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Delete this purchase of ${p.quantity} rounds of ${p.caliber}? It's removed from ammo on hand.`}
                      className="btn-link btn-link-danger text-xs"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ),
            },
          }))}
        />
      </Collapsible>
    </div>
  );
}
