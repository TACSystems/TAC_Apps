"use client";

import { useState, useTransition } from "react";
import { HOME_SECTIONS, type HomeLayout } from "@/lib/settings-shared";
import { saveHomeLayout } from "@/app/controls/actions";

const smallBtn = "border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800 disabled:opacity-30";

export default function HomeLayoutEditor({ initial }: { initial: HomeLayout }) {
  const [layout, setLayout] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(next: HomeLayout) {
    setLayout(next);
    setSaved(false);
  }

  function move(i: number, dir: -1 | 1) {
    const s = [...layout.sections];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    change({ ...layout, sections: s });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {layout.sections.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
            <label className="flex flex-1 items-center gap-2 normal-case">
              <input
                type="checkbox"
                checked={s.visible}
                onChange={(e) =>
                  change({
                    ...layout,
                    sections: layout.sections.map((x, j) => (j === i ? { ...x, visible: e.target.checked } : x)),
                  })
                }
              />
              <span className={s.visible ? "" : "text-neutral-500 line-through"}>{HOME_SECTIONS[s.key]}</span>
            </label>
            <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button
              type="button"
              className={smallBtn}
              disabled={i === layout.sections.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          Recent sessions shown
          <select
            value={layout.recentCount}
            onChange={(e) => change({ ...layout, recentCount: Number(e.target.value) })}
            className="border border-neutral-700 bg-neutral-900 px-2 py-1.5"
          >
            {[3, 5, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 normal-case">
          <input
            type="checkbox"
            checked={layout.maintenanceDueOnly}
            onChange={(e) => change({ ...layout, maintenanceDueOnly: e.target.checked })}
          />
          Maintenance: only show firearms that are due or due soon
        </label>
        <label className="flex items-center gap-2 normal-case">
          <input
            type="checkbox"
            checked={layout.includeStored}
            onChange={(e) => change({ ...layout, includeStored: e.target.checked })}
          />
          Maintenance: include stored firearms
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await saveHomeLayout(layout);
              setSaved(true);
            })
          }
          className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Home Layout"}
        </button>
        {saved && <span className="text-sm text-green-400">Saved.</span>}
      </div>
    </div>
  );
}
