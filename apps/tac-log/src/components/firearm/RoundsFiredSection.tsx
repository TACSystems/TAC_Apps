import { logRoundsFired, deleteRoundsFired } from "@/app/inventory/[id]/log-actions";
import SuggestInput from "@core/components/SuggestInput";
import SubmitButton from "@core/components/SubmitButton";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import Link from "next/link";
import { fd } from "@/lib/display";
import { todayISO } from "@/lib/settings-shared";
import { removeAdjustment } from "@/app/counts/actions";
import HelpTip from "@core/components/HelpTip";
import AmmoPickField from "@/components/AmmoPickField";
import { defaultPickFor } from "@/lib/ammo-pick";
import { lastPicks, pickLabel } from "@/lib/ammo";
import type { Firearm } from "@/lib/db/types";
import type Database from "better-sqlite3-multiple-ciphers";
import type { AppSettings } from "@/lib/settings-shared";
import type { CountAdjustment } from "@/lib/counts";
import type { PickOption } from "@/lib/ammo";

type RoundsEntry = {
  id: string;
  date: string;
  rounds: number;
  caliber: string | null;
  ammo_lot: string | null;
  deduct_from_ammo: number;
  notes: string | null;
  range_location: string | null;
  session_id: string | null;
  ammo_type: string | null;
  ammo_grain: number | null;
  ammo_manufacturer: string | null;
};

export default function RoundsFiredSection({ id, firearm, roundsLog, adjustments, settings, ammoOptions, rangeLocations, db }: { id: string; firearm: Firearm; roundsLog: RoundsEntry[]; adjustments: CountAdjustment[]; settings: AppSettings; ammoOptions: PickOption[]; rangeLocations: string[]; db: Database.Database }) {
  return (
    <>

        
        <p className="mb-3 text-sm text-neutral-400">
          Record practice, plinking, or function-check rounds. Adds to this firearm&apos;s shot count and cleaning counter,
          and joins the range session for that date and location.
        </p>
        <form action={logRoundsFired.bind(null, id)} className="grid grid-cols-1 gap-2 sm:max-w-4xl sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="req">Date</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={todayISO()}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="req">Rounds</span>
            <input
              type="number"
              name="rounds"
              min={1}
              required
              placeholder="e.g. 100"
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            Ammo Used
            <AmmoPickField
              options={ammoOptions}
              caliber={firearm.caliber}
              defaultValue={defaultPickFor(ammoOptions, firearm.caliber, lastPicks(db)[id])}
              className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Range / Location
            <SuggestInput name="range_location" listId="rf-locations" options={rangeLocations} defaultValue={settings.defaultRangeLocation || undefined} placeholder="Optional" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Ammo Lot #
            <input name="ammo_lot" placeholder="Optional" className="input" />
          </label>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="input sm:col-span-2"
          />
          <label className="flex items-center gap-2 text-xs normal-case sm:col-span-2">
            <input type="checkbox" name="deduct_from_ammo" defaultChecked={settings.deductManualRoundsByDefault} />
            <span>
              Deduct from ammo on hand <HelpTip text="Also subtract these rounds from Ammo On Hand for this caliber. Uncheck for rounds you did not buy, like range rental ammo." />
            </span>
          </label>
          <SubmitButton
            pendingLabel="Recording…"
            className="btn btn-primary w-fit sm:col-span-4"
          >
            Record Rounds Fired
          </SubmitButton>
        </form>
        {roundsLog.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 sm:max-w-4xl">
            {roundsLog.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
              >
                <span>
                  {r.session_id ? (
                    <Link href={`/range-log/session/${r.session_id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {fd(r.date)}
                    </Link>
                  ) : (
                    fd(r.date)
                  )}{" "}
                  · {r.rounds} rds
                  {r.caliber
                    ? ` · ${pickLabel({ caliber: r.caliber, ammo_type: r.ammo_type, grain: r.ammo_grain, manufacturer: r.ammo_manufacturer })}`
                    : ""}
                  {r.range_location ? ` · ${r.range_location}` : ""}
                  {r.ammo_lot ? ` · Lot ${r.ammo_lot}` : ""}
                  {!r.deduct_from_ammo ? <span className="text-neutral-500"> · not deducted from ammo</span> : null}
                  {r.notes ? <span className="text-neutral-500"> · {r.notes}</span> : null}
                </span>
                <form action={deleteRoundsFired.bind(null, id, r.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remove this entry? ${r.rounds} rounds will be subtracted from this firearm's shot count${
                      r.deduct_from_ammo ? " and added back to ammo on hand" : ""
                    }.`}
                    className="btn-link btn-link-danger text-xs"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
            {roundsLog.length > 10 && (
              <p className="text-xs text-neutral-500">Showing the latest 10 of {roundsLog.length} entries.</p>
            )}
          </div>
        )}
        {adjustments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 sm:max-w-4xl">
            <div className="text-xs text-neutral-500">Count corrections</div>
            {adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border border-dashed border-neutral-700 px-3 py-1.5 text-sm">
                <span>
                  {fd(a.date)} · set to {a.set_to?.toLocaleString() ?? "?"} ({a.delta >= 0 ? "+" : ""}
                  {a.delta.toLocaleString()})
                  {a.note ? <span className="text-neutral-500"> · {a.note}</span> : null}
                </span>
                <form action={removeAdjustment.bind(null, a.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remove this correction? The shot count goes ${a.delta >= 0 ? "down" : "up"} by ${Math.abs(a.delta)}.`}
                    className="btn-link btn-link-danger text-xs"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
                </>
  );
}
