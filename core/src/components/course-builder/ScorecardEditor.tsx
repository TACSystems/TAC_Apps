"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  BUILTIN_FIELD_KEYS,
  BUILTIN_FIELD_LABELS,
  type LoadedCourse,
  type ScorecardConfig,
  type ScorecardField,
} from "@core/lib/cof-shared";
import { PrintScorecard } from "@core/components/CourseSheet";
import { addLink, customKey, input, moved, smallBtn } from "./model";

export default function ScorecardEditor({
  scorecard,
  setScorecard,
  previewCourse,
}: {
  scorecard: ScorecardConfig;
  setScorecard: Dispatch<SetStateAction<ScorecardConfig>>;
  previewCourse: LoadedCourse;
}) {
  const allFields = [...scorecard.header, ...scorecard.signoff];
  const missingBuiltinFields = BUILTIN_FIELD_KEYS.filter((k) => !allFields.some((f) => f.key === k));
  function setField(list: "header" | "signoff", index: number, patch: Partial<ScorecardField>) {
    setScorecard((sc) => ({
      ...sc,
      [list]: sc[list].map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  return (
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">5 · Scorecard Fields</h2>
        <p className="text-xs text-neutral-500">
          These lines print on the scorecard and appear on the scoring form. &quot;Wide&quot; spans the full width;
          &quot;Print only&quot; is for lines like signatures that are filled in by hand.
        </p>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_34rem]">
        <div className="flex flex-col gap-3">
        {(["header", "signoff"] as const).map((list) => (
          <div key={list} className="flex flex-col gap-2">
            <div className="text-sm text-neutral-300">
              {list === "header" ? "Top of card" : "Sign-off (bottom of card)"}
            </div>
            {scorecard[list].map((f, i) => (
              <div key={f.key} className="flex flex-wrap items-center gap-3">
                <input
                  value={f.label}
                  onChange={(e) => setField(list, i, { label: e.target.value })}
                  className={`${input} w-56`}
                />
                <label className="flex items-center gap-1 text-xs normal-case">
                  <input type="checkbox" checked={Boolean(f.wide)} onChange={(e) => setField(list, i, { wide: e.target.checked })} />
                  Wide
                </label>
                <label className="flex items-center gap-1 text-xs normal-case">
                  <input
                    type="checkbox"
                    checked={Boolean(f.printOnly)}
                    onChange={(e) => setField(list, i, { printOnly: e.target.checked })}
                  />
                  Print only
                </label>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === 0}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: moved(sc[list], i, -1) }))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === scorecard[list].length - 1}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: moved(sc[list], i, 1) }))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  title="Move to the other section"
                  onClick={() =>
                    setScorecard((sc) => {
                      const other = list === "header" ? "signoff" : "header";
                      return { ...sc, [list]: sc[list].filter((_, j) => j !== i), [other]: [...sc[other], f] } as ScorecardConfig;
                    })
                  }
                >
                  {list === "header" ? "→ Sign-off" : "→ Top"}
                </button>
                <button
                  type="button"
                  className={`${smallBtn} text-red-300`}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: sc[list].filter((_, j) => j !== i) }))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`${addLink} w-fit`}
              onClick={() =>
                setScorecard((sc) => ({ ...sc, [list]: [...sc[list], { key: customKey("f"), label: "New Field" }] }))
              }
            >
              + Add field
            </button>
          </div>
        ))}
        {missingBuiltinFields.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const k = e.target.value as keyof typeof BUILTIN_FIELD_LABELS;
              if (!k) return;
              const field: ScorecardField = {
                key: k,
                label: BUILTIN_FIELD_LABELS[k],
                printOnly: k === "grader_signature",
              };
              setScorecard((sc) =>
                k.startsWith("grader_") ? { ...sc, signoff: [...sc.signoff, field] } : { ...sc, header: [...sc.header, field] }
              );
            }}
            className={`${input} w-fit`}
          >
            <option value="">+ Restore standard field…</option>
            {missingBuiltinFields.map((k) => (
              <option key={k} value={k}>
                {BUILTIN_FIELD_LABELS[k]}
              </option>
            ))}
          </select>
        )}
        </div>

        <aside className="xl:sticky xl:top-24 h-fit">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs tracking-widest text-neutral-400">Live preview</span>
            <span className="text-[11px] normal-case text-neutral-500">exactly what prints</span>
          </div>
          <div className="max-h-[36rem] overflow-auto border border-neutral-700 bg-white p-4 text-black">
            <PrintScorecard course={previewCourse} />
          </div>
          <p className="mt-2 text-[11px] normal-case text-neutral-500">
            Blank lines are filled in by hand or by the scoring form. Changes above appear here as you type.
          </p>
        </aside>
        </div>
      </section>
  );
}
