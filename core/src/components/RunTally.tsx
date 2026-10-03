"use client";

import { useEffect, useState } from "react";
import { fmtSeconds, type WeaponTally } from "@core/lib/run-clock";

/**
 * Nothing a run tallies is posted until it has been looked at. A skipped
 * string or a re-run makes the count non-obvious often enough to be worth
 * seeing, and a count that is wrong is worse than no count at all, so the
 * rounds are editable here and nowhere else in the run.
 */
export default function RunTally({
  courseName,
  courseCode,
  elapsed,
  fired,
  skipped,
  reruns,
  tallies,
  destinations = {},
  dryFire = false,
  onAccept,
  onDiscard,
}: {
  courseName: string;
  courseCode?: string | null;
  elapsed: number;
  fired: number;
  skipped: number;
  reruns: number;
  tallies: WeaponTally[];
  /** What each weapon's rounds post to. A weapon with no entry posts nowhere. */
  destinations?: Record<string, string>;
  dryFire?: boolean;
  onAccept: (tallies: WeaponTally[]) => void;
  onDiscard: () => void;
}) {
  const [counts, setCounts] = useState<string[]>(() => tallies.map((t) => String(t.rounds)));
  const [confirming, setConfirming] = useState(false);
  const edited = tallies.map((t, i) => ({ weapon: t.weapon, rounds: Math.max(0, Math.round(Number(counts[i]) || 0)) }));
  const total = edited.reduce((n, t) => n + t.rounds, 0);
  const changed = edited.some((t, i) => t.rounds !== tallies[i].rounds);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAccept(edited);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setConfirming((c) => {
          if (c) onDiscard();
          return true;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="run-tally-wrap" role="dialog" aria-label="Run summary">
      <div className="run-tally brk">
        <div className="run-tally-head">
          <span className="run-lbl">Run Complete</span>
          <h2>{courseName}</h2>
          {courseCode ? <span className="run-code">{courseCode}</span> : null}
          {dryFire ? <span className="run-pill run-dry">Dry Fire</span> : null}
        </div>

        <div className="run-tally-stats">
          <div>
            <span className="run-lbl">Course Time</span>
            <span className="run-v">{fmtSeconds(elapsed)}</span>
          </div>
          <div>
            <span className="run-lbl">Strings Fired</span>
            <span className="run-v">{fired}</span>
          </div>
          <div>
            <span className="run-lbl">Skipped</span>
            <span className={`run-v${skipped ? " run-tally-warn" : ""}`}>{skipped}</span>
          </div>
          <div>
            <span className="run-lbl">Re-runs</span>
            <span className={`run-v${reruns ? " run-tally-warn" : ""}`}>{reruns}</span>
          </div>
        </div>

        <table className="run-tally-rounds">
          <thead>
            <tr>
              <th>Weapon</th>
              <th>Rounds</th>
              <th>Posts to</th>
            </tr>
          </thead>
          <tbody>
            {edited.map((t, i) => {
              const dest = t.weapon ? destinations[t.weapon] : destinations[""];
              return (
                <tr key={t.weapon ?? ""}>
                  <td>{t.weapon ?? "Rounds fired"}</td>
                  <td>
                    <input
                      value={counts[i]}
                      inputMode="numeric"
                      aria-label={`Rounds for ${t.weapon ?? "this course"}`}
                      onChange={(e) =>
                        setCounts((c) => c.map((v, k) => (k === i ? e.target.value.replace(/[^\d]/g, "") : v)))
                      }
                    />
                  </td>
                  <td className={dest ? "" : "run-tally-none"}>{dest ?? "Nothing — not recorded"}</td>
                </tr>
              );
            })}
            <tr className="run-tally-total">
              <td>Total</td>
              <td>{total}</td>
              <td>{changed ? <span className="run-tally-warn">Corrected</span> : null}</td>
            </tr>
          </tbody>
        </table>

        <div className="run-tally-foot">
          {confirming ? (
            <span className="run-tally-warn">Escape again to discard this run. Nothing will be recorded.</span>
          ) : (
            <span>Nothing is recorded until you accept.</span>
          )}
          <span className="run-spacer" />
          <button type="button" className="run-tally-ghost" onClick={() => (confirming ? onDiscard() : setConfirming(true))}>
            <kbd>ESC</kbd>Discard
          </button>
          <button type="button" className="run-tally-go" onClick={() => onAccept(edited)}>
            <kbd>ENTER</kbd>Accept
          </button>
        </div>
      </div>
    </div>
  );
}
