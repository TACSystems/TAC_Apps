"use client";

import { useMemo, useState } from "react";
import SubmitButton from "@core/components/SubmitButton";
import { saveScores } from "@/app/classes/actions";

export type GridZone = { zone_label: string; value: number };

export type GridStudent = {
  student_id: string;
  name: string;
  relay: number | null;
  lane: number | null;
  counts: Record<string, number>;
  firearm: string | null;
};

export default function ScoringGrid({
  classId,
  cofId,
  date,
  attempt,
  kind,
  zones,
  maxPoints,
  passing,
  totalRounds,
  students,
}: {
  classId: string;
  cofId: string;
  date: string;
  attempt: number;
  kind: "qual" | "remedial";
  zones: GridZone[];
  maxPoints: number;
  passing: number | null;
  totalRounds: number;
  students: GridStudent[];
}) {
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (const s of students) init[s.student_id] = { ...s.counts };
    return init;
  });

  function set(studentId: string, zone: string, raw: string) {
    const n = raw === "" ? 0 : Math.max(0, Math.round(Number(raw)));
    setCounts((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [zone]: Number.isFinite(n) ? n : 0 },
    }));
  }

  const totals = useMemo(() => {
    const out: Record<string, { points: number; rounds: number; percent: number | null; entered: boolean }> = {};
    for (const s of students) {
      const c = counts[s.student_id] ?? {};
      let points = 0;
      let rounds = 0;
      let entered = false;
      for (const z of zones) {
        const n = c[z.zone_label] ?? 0;
        if (n > 0) entered = true;
        points += n * z.value;
        rounds += n;
      }
      out[s.student_id] = {
        points,
        rounds,
        percent: maxPoints > 0 ? Math.round((points / maxPoints) * 1000) / 10 : null,
        entered,
      };
    }
    return out;
  }, [counts, students, zones, maxPoints]);

  const scoredCount = students.filter((s) => totals[s.student_id]?.entered).length;

  return (
    <form action={saveScores} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="cof_id" value={cofId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="attempt" value={attempt} />
      <input type="hidden" name="kind" value={kind} />

      <div className="overflow-x-auto">
        <table className="table min-w-[52rem]">
          <thead>
            <tr>
              <th className="w-16">Lane</th>
              <th>Student</th>
              {zones.map((z) => (
                <th key={z.zone_label} className="w-20 text-right">
                  {z.zone_label}
                  <span className="block text-[10px] font-normal text-neutral-500">{z.value} pt</span>
                </th>
              ))}
              <th className="w-24 text-right">Rounds</th>
              <th className="w-24 text-right">Points</th>
              <th className="w-20 text-right">%</th>
              <th className="w-28">Result</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const t = totals[s.student_id];
              const over = totalRounds > 0 && t.rounds > totalRounds;
              const passed = passing != null && t.percent != null && t.percent >= passing;
              return (
                <tr key={s.student_id}>
                  <td className="text-neutral-400">{s.lane ?? "—"}</td>
                  <td className="font-bold">
                    {s.name}
                    <input type="hidden" name="row_student" value={s.student_id} />
                    <input type="hidden" name={`firearm:${s.student_id}`} value={s.firearm ?? ""} />
                  </td>
                  {zones.map((z) => (
                    <td key={z.zone_label} className="text-right">
                      <input
                        className="input w-16 text-right"
                        type="number"
                        min={0}
                        max={999}
                        inputMode="numeric"
                        name={`count:${s.student_id}:${z.zone_label}`}
                        value={counts[s.student_id]?.[z.zone_label] || ""}
                        onChange={(e) => set(s.student_id, z.zone_label, e.target.value)}
                        aria-label={`${z.zone_label} hits for ${s.name}`}
                      />
                    </td>
                  ))}
                  <td className={`text-right ${over ? "text-red-400" : "text-neutral-400"}`}>
                    {t.rounds}
                    {totalRounds > 0 ? `/${totalRounds}` : ""}
                  </td>
                  <td className="text-right font-bold">{t.entered ? t.points : "—"}</td>
                  <td className="text-right">{t.entered && t.percent != null ? t.percent.toFixed(1) : "—"}</td>
                  <td>
                    {t.entered && passing != null ? (
                      <span className={`result-badge ${passed ? "result-pass" : "result-fail"}`}>
                        {passed ? "PASS" : "FAIL"}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">{t.entered ? "No pass mark" : "Not shot"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          Save Relay
        </SubmitButton>
        <span className="text-xs text-neutral-400">
          {scoredCount} of {students.length} have hits entered. Rows left blank are not saved, so an unshot lane never
          records as a fail.
        </span>
      </div>
    </form>
  );
}
