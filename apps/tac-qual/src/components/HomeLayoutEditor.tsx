"use client";

import { useState, useTransition } from "react";
import HomeSectionsEditor from "@core/components/HomeSectionsEditor";
import {
  CALENDAR_WEEKS,
  DUE_SOON_DAYS,
  HOME_SECTIONS,
  type HomeLayout,
} from "@/lib/settings-shared";
import { saveHomeLayout } from "@/app/controls/actions";

export default function HomeLayoutEditor({ initial }: { initial: HomeLayout }) {
  const [layout, setLayout] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(next: HomeLayout) {
    setLayout(next);
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <HomeSectionsEditor
        sections={layout.sections}
        labels={HOME_SECTIONS}
        onChange={(sections) => change({ ...layout, sections })}
      />

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          Calendar weeks shown
          <select
            value={layout.calendarWeeks}
            onChange={(e) => change({ ...layout, calendarWeeks: Number(e.target.value) })}
            className="input input-sm"
          >
            {CALENDAR_WEEKS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Recent classes shown
          <select
            value={layout.recentCount}
            onChange={(e) => change({ ...layout, recentCount: Number(e.target.value) })}
            className="input input-sm"
          >
            {[3, 5, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Currency: due soon window
          <select
            value={layout.currencyDueSoonDays}
            onChange={(e) => change({ ...layout, currencyDueSoonDays: Number(e.target.value) })}
            className="input input-sm"
          >
            {DUE_SOON_DAYS.map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 normal-case">
          <input
            type="checkbox"
            checked={layout.currencyHideCurrent}
            onChange={(e) => change({ ...layout, currencyHideCurrent: e.target.checked })}
          />
          Currency: only list students who are expired, due soon or never passed
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
          className="btn btn-primary"
        >
          {pending ? "Saving…" : "Save Dashboard Layout"}
        </button>
        {saved && <span className="text-sm text-green-400">Saved.</span>}
      </div>
    </div>
  );
}
