"use client";

import UnsavedGuard from "@/components/UnsavedGuard";
import { useState } from "react";
import type { Firearm } from "@/lib/db/types";
import { passFail, type ScorecardField, type ZoneDef } from "@/lib/cof-shared";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/settings-shared";
import { firearmMatchesCategories } from "@/lib/course-categories";

const inputCls = "rounded border border-neutral-700 bg-neutral-900 px-3 py-2";

export default function ScoringForm({
  zones,
  fields,
  firearms,
  totalRounds,
  maxPoints,
  passing,
  defaults,
  suggestions,
  action,
  initial,
  matchCategories = [],
  graderDateFollows = false,
  submitLabel = "Save Range Session",
}: {
  zones: ZoneDef[];
  fields: ScorecardField[];
  firearms: Firearm[];
  totalRounds: number;
  maxPoints: number;
  passing: number | null;
  defaults: Record<string, string>;
  suggestions: Record<string, string[]>;
  action: (formData: FormData) => void;
  initial?: {
    date: string;
    firearm_id: string | null;
    rounds_fired: number | null;
    counts: Record<string, number>;
    notes: string | null;
    passing: number | null;
  };
  submitLabel?: string;
  matchCategories?: string[];
  graderDateFollows?: boolean;
}) {
  const [sessionDate, setSessionDate] = useState(initial?.date ?? todayISO());
  const [graderDate, setGraderDate] = useState(defaults.grader_date ?? "");
  const [graderTouched, setGraderTouched] = useState(Boolean(defaults.grader_date) || !graderDateFollows);
  const shownGraderDate = graderTouched ? graderDate : sessionDate;
  const matching = matchCategories.length ? firearms.filter((f) => firearmMatchesCategories(f.platform, matchCategories)) : [];
  const others = matching.length ? firearms.filter((f) => !matching.includes(f)) : firearms;
  const [counts, setCounts] = useState<Record<string, number>>(initial?.counts ?? {});

  const totalPoints = zones.reduce((sum, z) => sum + z.value * (counts[z.zone_label] ?? 0), 0);
  const roundsCounted = zones.reduce((sum, z) => sum + (counts[z.zone_label] ?? 0), 0);
  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 1000) / 10 : null;
  const result = passFail(percent, initial ? initial.passing : passing);

  return (
    <form action={action} className="flex flex-col gap-4">
      <UnsavedGuard />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="date"
            required
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Firearm
          <select name="firearm_id" required defaultValue={initial?.firearm_id ?? ""} className={inputCls}>
            <option value="">— Select —</option>
            {matching.length > 0 ? (
              <>
                <optgroup label={`Matches this course (${matchCategories.join(", ")})`}>
                  {matching.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label ?? f.make_model}
                    </option>
                  ))}
                </optgroup>
                {others.length > 0 && (
                  <optgroup label="Other firearms">
                    {others.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label ?? f.make_model}
                      </option>
                    ))}
                  </optgroup>
                )}
              </>
            ) : (
              firearms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label ?? f.make_model}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rounds Fired
          <input type="number" name="rounds_fired" min={0} defaultValue={initial ? initial.rounds_fired ?? "" : totalRounds || ""} className={inputCls} />
        </label>
        {initial && (
          <label className="flex flex-col gap-1 text-sm">
            Passing Score (%) for this session
            <input
              type="number"
              name="passing_score_percent"
              min={0}
              max={100}
              step="any"
              defaultValue={initial.passing ?? ""}
              placeholder="None"
              className={inputCls}
            />
          </label>
        )}
        {fields.filter((f) => f.key !== "weapon_used").map((f) => (
          <label key={f.key} className={`flex flex-col gap-1 text-sm ${f.wide ? "sm:col-span-2" : ""}`}>
            {f.label}
            <input
              name={`field:${f.key}`}
              type={f.key === "grain" ? "number" : f.key === "grader_date" ? "date" : "text"}
              placeholder={f.key === "caliber" ? "Defaults to the firearm's caliber" : undefined}
              {...(f.key === "grader_date"
                ? {
                    value: shownGraderDate,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      setGraderTouched(true);
                      setGraderDate(e.target.value);
                    },
                  }
                : { defaultValue: defaults[f.key] ?? "" })}
              list={suggestions[f.key]?.length ? `suggest-${f.key}` : undefined}
              autoComplete="off"
              className={inputCls}
            />
          </label>
        ))}
        {Object.entries(suggestions).map(([key, opts]) => (
          <datalist key={key} id={`suggest-${key}`}>
            {opts.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
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
                      defaultValue={initial?.counts[z.zone_label] ?? 0}
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
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={inputCls} />
      </label>

      <SubmitButton
        pendingLabel="Saving Session…"
        className="w-fit rounded bg-brand-olive px-4 py-2 font-medium hover:bg-brand-olive-light"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
