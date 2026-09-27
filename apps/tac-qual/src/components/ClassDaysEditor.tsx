"use client";

import { useState } from "react";

type Row = { key: number; date: string; start: string; end: string };

let nextKey = 1;

export default function ClassDaysEditor({
  initial,
  today,
}: {
  initial: { date: string; start_time: string | null; end_time: string | null }[];
  today: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (initial.length ? initial : [{ date: today, start_time: "", end_time: "" }]).map((d) => ({
      key: nextKey++,
      date: d.date,
      start: d.start_time ?? "",
      end: d.end_time ?? "",
    }))
  );

  const set = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addDay() {
    setRows((rs) => {
      const last = rs[rs.length - 1];
      const next = last?.date ? new Date(`${last.date}T00:00:00Z`) : new Date(`${today}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      return [
        ...rs,
        {
          key: nextKey++,
          date: next.toISOString().slice(0, 10),
          start: last?.start ?? "",
          end: last?.end ?? "",
        },
      ];
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs tracking-widest text-neutral-400">Days</span>
      {rows.map((r, i) => (
        <div key={r.key} className="flex flex-wrap items-end gap-2">
          <span className="w-12 pb-2 text-xs text-neutral-500">Day {i + 1}</span>
          <label className="field">
            <span className="req">Date</span>
            <input className="input" type="date" name="day_date" value={r.date} onChange={(e) => set(r.key, { date: e.target.value })} required />
          </label>
          <label className="field">
            <span>Start</span>
            <input className="input" type="time" name="day_start" value={r.start} onChange={(e) => set(r.key, { start: e.target.value })} />
          </label>
          <label className="field">
            <span>End</span>
            <input className="input" type="time" name="day_end" value={r.end} onChange={(e) => set(r.key, { end: e.target.value })} />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm mb-0.5"
            disabled={rows.length === 1}
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addDay} className="w-fit text-sm text-brand-amber hover:text-brand-amber-light">
        + Add day
      </button>
      <p className="text-xs text-neutral-500">
        Days are sorted by date when saved, so the order you type them in does not matter. The earliest day is the
        class date.
      </p>
    </div>
  );
}
