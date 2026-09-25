import SubmitButton from "@core/components/SubmitButton";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { fd } from "@/lib/display";
import { todayISO } from "@/lib/settings-shared";
import { createCounter, removeCounter, replaceCounter } from "@/app/counts/actions";
import HelpTip from "@core/components/HelpTip";
import type { Firearm } from "@/lib/db/types";
import type { FirearmCounter } from "@/lib/counts";

export default function PartCountersSection({ id, firearm, counters }: { id: string; firearm: Firearm; counters: FirearmCounter[] }) {
  return (
    <>

        
        <p className="mb-3 text-sm text-neutral-400">
          Track rounds on a barrel, recoil spring, or other part separately from the lifetime total. When you replace the
          part, click Replaced: the counter starts over and the swap is added to the maintenance log.
        </p>
        {counters.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 sm:max-w-4xl">
            {counters.map((c) => {
              const since = Math.max(0, firearm.shots_fired - c.start_shots);
              const pct = c.interval_rounds ? Math.min(100, Math.round((since / c.interval_rounds) * 100)) : null;
              const due = c.interval_rounds != null && since >= c.interval_rounds;
              return (
                <div key={c.id} className={`border bg-neutral-900 px-3 py-2 text-sm ${due ? "border-red-900" : "border-neutral-800"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="text-brand-amber">{c.name}</span> · {since.toLocaleString()} rounds since {fd(c.start_date)}
                      {c.interval_rounds ? (
                        <span className={due ? " text-red-300" : " text-neutral-500"}>
                          {" "}
                          · replace at {c.interval_rounds.toLocaleString()}
                          {due ? " · DUE" : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex gap-2">
                      <form action={replaceCounter.bind(null, id, c.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Record a replacement of the ${c.name} today? Its counter starts over at 0 (the ${since} rounds are noted in the maintenance log).`}
                          className="btn btn-secondary btn-xs"
                        >
                          Replaced
                        </ConfirmSubmitButton>
                      </form>
                      <form action={removeCounter.bind(null, id, c.id)}>
                        <ConfirmSubmitButton confirmMessage={`Delete the ${c.name} counter?`} className="btn-link btn-link-danger text-xs">
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </span>
                  </div>
                  {pct != null && (
                    <div className="mt-1 h-1 w-full bg-neutral-800">
                      <div className={`h-1 ${due ? "bg-red-500" : "bg-brand-amber"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <details className="group sm:max-w-4xl">
          <summary className="btn btn-secondary inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ Add Part Counter</span>
            <span className="hidden group-open:inline">Cancel</span>
          </summary>
          <form action={createCounter.bind(null, id)} className="mt-2 grid grid-cols-1 gap-2 border border-neutral-800 bg-neutral-900/50 p-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="req">Part</span>
              <input name="name" required list="counter-parts" placeholder="e.g. Barrel" className="input" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Installed / Since
              <input type="date" name="start_date" defaultValue={todayISO()} className="input" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Rounds on it already
              <input type="number" name="rounds_since" min={0} defaultValue={0} className="input" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span>
                Replace every (rounds) <HelpTip text="Optional. The counter turns red and shows in the Heads Up bar when the part reaches this many rounds." />
              </span>
              <input type="number" name="interval_rounds" min={1} placeholder="Optional" className="input" />
            </label>
            <datalist id="counter-parts">
              {["Barrel", "Recoil Spring", "Extractor", "Firing Pin", "Bolt", "Buffer Spring", "Gas Rings", "Magazine Springs", "Suppressor Wipes"].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <SubmitButton className="btn btn-primary w-fit sm:col-span-4">Add Counter</SubmitButton>
          </form>
        </details>
                </>
  );
}
