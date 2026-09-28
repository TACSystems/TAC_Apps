"use client";

import { useState } from "react";
import type { PastRun } from "@/lib/previous-runs";

function Zones({ run }: { run: PastRun }) {
  const total = run.zones.reduce((n, z) => n + z.counted, 0);
  if (total === 0) return <p className="text-xs text-neutral-500">No zone counts recorded.</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {run.zones.map((z) => (
        <div key={z.zone_label} className="border border-neutral-700 px-3 py-2 text-center">
          <div className="text-[10px] tracking-widest text-neutral-500">{z.zone_label}</div>
          <div className="font-mono text-xl font-bold">{z.counted}</div>
        </div>
      ))}
    </div>
  );
}

export default function PreviousRun({
  last,
  best,
  scope,
}: {
  last: PastRun | null;
  best: PastRun | null;
  scope: "firearm" | "course";
}) {
  const [open, setOpen] = useState(false);
  const [which, setWhich] = useState<"last" | "best">("last");
  const run = which === "last" ? last : best;

  if (!last && !best) {
    return (
      <p className="text-xs uppercase tracking-widest text-neutral-500">
        {scope === "firearm" ? "No previous run of this course with this firearm" : "No previous run of this course"}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs uppercase tracking-widest text-neutral-500 hover:text-brand-amber"
        onClick={() => setOpen(true)}
      >
        V — Previous run
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-widest text-neutral-400">
          Previous run{scope === "course" ? " — any firearm" : ""}
        </span>
        <span className="ml-auto flex border border-neutral-700">
          {(["last", "best"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setWhich(k)}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest ${
                which === k ? "bg-brand-amber font-bold text-neutral-950" : "text-neutral-500"
              }`}
            >
              {k}
            </button>
          ))}
        </span>
        <button type="button" className="text-[10px] uppercase tracking-widest text-neutral-500" onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>

      {!run ? (
        <p className="text-xs text-neutral-500">Nothing recorded for that yet.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <Zones run={run} />
          <div className="space-y-1 text-sm">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">{run.date}</div>
            <div>{run.firearm ?? "No firearm recorded"}</div>
            <div className="font-mono">
              {run.total_points ?? "—"}
              {run.final_score_percent != null ? ` · ${run.final_score_percent.toFixed(1)}%` : ""}
            </div>
            {run.final_score_percent != null && run.passing_score_percent != null ? (
              <span
                className={`result-badge ${
                  run.final_score_percent >= run.passing_score_percent ? "result-pass" : "result-fail"
                }`}
              >
                {run.final_score_percent >= run.passing_score_percent ? "PASS" : "FAIL"}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
