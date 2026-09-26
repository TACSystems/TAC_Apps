"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  BUILTIN_COLUMN_KEYS,
  BUILTIN_COLUMN_LABELS,
  type CourseColumn,
  } from "@core/lib/cof-shared";
import { addLink, customKey, input, moved, smallBtn } from "./model";

export default function ColumnsEditor({ columns, setColumns }: { columns: CourseColumn[]; setColumns: Dispatch<SetStateAction<CourseColumn[]>> }) {
  const missingBuiltinColumns = BUILTIN_COLUMN_KEYS.filter((k) => !columns.some((c) => c.key === k));
  return (
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">3 · String Table Columns</h2>
        <p className="text-xs text-neutral-500">
          &quot;#&quot; (string number and option) is always first. Rename, reorder, remove, or add your own columns.
        </p>
        <div className="flex flex-col gap-2">
          {columns.map((c, i) => (
            <div key={c.key} className="flex flex-wrap items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => setColumns((cs) => cs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                className={`${input} w-56`}
              />
              <span className="text-xs text-neutral-500">
                {c.key in BUILTIN_COLUMN_LABELS ? "standard" : "custom"}
                {c.key === "rounds" ? " · used for round totals" : ""}
              </span>
              <button type="button" className={smallBtn} disabled={i === 0} onClick={() => setColumns((cs) => moved(cs, i, -1))}>
                ↑
              </button>
              <button
                type="button"
                className={smallBtn}
                disabled={i === columns.length - 1}
                onClick={() => setColumns((cs) => moved(cs, i, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={`${smallBtn} text-red-300`}
                onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className={addLink}
            onClick={() => setColumns((cs) => [...cs, { key: customKey("x"), label: "New Column" }])}
          >
            + Add custom column
          </button>
          {missingBuiltinColumns.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const k = e.target.value as keyof typeof BUILTIN_COLUMN_LABELS;
                if (k) setColumns((cs) => [...cs, { key: k, label: BUILTIN_COLUMN_LABELS[k] }]);
              }}
              className={input}
            >
              <option value="">+ Restore standard column…</option>
              {missingBuiltinColumns.map((k) => (
                <option key={k} value={k}>
                  {BUILTIN_COLUMN_LABELS[k]}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>
  );
}
