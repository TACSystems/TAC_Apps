"use client";

import { useState } from "react";
import type { Firearm } from "@/lib/db/types";
import { passFail, type ScorecardField, type ZoneDef } from "@/lib/cof-shared";
import SubmitButton from "@/components/SubmitButton";

const inputCls = "rounded border border-neutral-700 bg-neutral-900 px-3 py-2";

export default function ScoringForm({
  zones,
  fields,
  firearms,
  totalRounds,
  maxPoints,
  passing,
  action,
}: {
  zones: ZoneDef[];
  fields: ScorecardField[];
  firearms: Firearm[];
  totalRounds: number;
  maxPoints: number;
  passing: number | null;
  action: (formData: FormData) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const totalPoints = zones.reduce((sum, z) => sum + z.value * (counts[z.zone_label] ?? 0), 0);
  const roundsCounted = zones.reduce((sum, z) => sum + (counts[z.zone_label] ?? 0), 0);
  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 1000) / 10 : null;
  const result = passFail(percent, passing);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Firearm
          <select name="firearm_id" required className={inputCls}>
            <option value="">— Select —</option>
            {firearms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.make_model}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rounds Fired
          <input type="number" name="rounds_fired" min={0} defaultValue={totalRounds || ""} className={inputCls} />
        </label>
        {fields.map((f) => (
          <label key={f.key} className={`flex flex-col gap-1 text-sm ${f.wide ? "sm:col-span-2" : ""}`}>
            {f.label}
            <input
              name={`field:${f.key}`}
              type={f.key === "grain" ? "number" : f.key === "grader_date" ? "date" : "text"}
              placeholder={f.key === "caliber" ? "Defaults to the firearm's caliber" : undefined}
              className={inputCls}
            />
          </label>
        ))}
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
                <tr key={z.zone_label} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{z.zone_label}</td>
                  <td className="px-3 py-2">{z.value}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      name={`zone:${z.zone_label}`}
                      min={0}
                      defaultValue={0}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [z.zone_label]: Number(e.target.value || 0) }))
                      }
                      className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">{z.value * (counts[z.zone_label] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 rounded border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <div>
          <div className="text-neutral-500">Rounds Counted</div>
          <div className={`text-lg ${roundsCounted > totalRounds ? "text-red-400" : ""}`}>
            {roundsCounted} / {totalRounds}
          </div>
        </div>
        <div>
          <div className="text-neutral-500">Total Points</div>
          <div className="text-lg">
            {totalPoints} / {maxPoints}
          </div>
        </div>
        <div>
          <div className="text-neutral-500">Final Score</div>
          <div className="text-lg">{percent != null ? `${percent}%` : "—"}</div>
        </div>
        {passing != null && (
          <div>
            <div className="text-neutral-500">Result (pass {passing}%)</div>
            <div className={`text-lg ${result === "PASS" ? "text-green-400" : "text-red-400"}`}>{result}</div>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea name="notes" rows={3} className={inputCls} />
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
