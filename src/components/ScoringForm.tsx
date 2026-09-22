"use client";

import { useMemo, useState } from "react";
import type { CofScoringZone, Firearm } from "@/lib/db/types";
import SubmitButton from "@/components/SubmitButton";

export default function ScoringForm({
  zones,
  firearms,
  totalRounds,
  action,
}: {
  zones: CofScoringZone[];
  firearms: Firearm[];
  totalRounds: number | null;
  action: (formData: FormData) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const highestZoneValue = useMemo(
    () => zones.reduce((max, z) => Math.max(max, z.value), 0),
    [zones]
  );
  const maxPoints = totalRounds ? totalRounds * highestZoneValue : 0;

  const totalPoints = zones.reduce((sum, z) => sum + z.value * (counts[z.id] ?? 0), 0);
  const roundsCounted = zones.reduce((sum, z) => sum + (counts[z.id] ?? 0), 0);
  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 1000) / 10 : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="max_points" value={maxPoints} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Firearm
          <select
            name="firearm_id"
            required
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">— Select —</option>
            {firearms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.make_model}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Weapon Used (free text)
          <input name="weapon_used" className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
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
          Ammo Lot #
          <input name="ammo_lot" className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Range Location
          <input
            name="range_location"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Weather Conditions
          <input
            name="weather_conditions"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rounds Fired
          <input
            type="number"
            name="rounds_fired"
            defaultValue={totalRounds ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Grader Name
          <input
            name="grader_name"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-medium text-neutral-200">Scoring</h2>
        <div className="overflow-x-auto rounded border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Counted</th>
                <th className="px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{z.zone_label}</td>
                  <td className="px-3 py-2">{z.value}</td>
                  <td className="px-3 py-2">
                    <input type="hidden" name="zone_label" value={z.zone_label} />
                    <input type="hidden" name="zone_value" value={z.value} />
                    <input
                      type="number"
                      name="zone_counted"
                      min={0}
                      defaultValue={0}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [z.id]: Number(e.target.value || 0) }))
                      }
                      className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">{z.value * (counts[z.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-6 rounded border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <div>
          <div className="text-neutral-500">Rounds Counted</div>
          <div className="text-lg">{roundsCounted}</div>
        </div>
        <div>
          <div className="text-neutral-500">Total Points</div>
          <div className="text-lg">{totalPoints}</div>
        </div>
        <div>
          <div className="text-neutral-500">Final Score</div>
          <div className="text-lg">{percent != null ? `${percent}%` : "—"}</div>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          name="notes"
          rows={3}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>

      <SubmitButton
        pendingLabel="Saving Run…"
        className="w-fit rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
      >
        Save Run
      </SubmitButton>
    </form>
  );
}
