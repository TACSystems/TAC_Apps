"use client";

import { useState, useTransition } from "react";

export default function CountCorrector({
  current,
  label = "Correct count",
  unit = "rounds",
  help,
  save,
}: {
  current: number;
  label?: string;
  unit?: string;
  help?: string;
  save: (value: number, note: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(current));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const n = Number(value);
  const delta = Number.isFinite(n) ? Math.round(n) - current : 0;

  if (!open) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => {
            setValue(String(current));
            setMsg(null);
            setOpen(true);
          }}
          className="border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
        >
          {label}
        </button>
        {msg && <span className={`text-xs ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</span>}
      </span>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border border-neutral-700 bg-neutral-950 p-3 text-sm">
      {help && <p className="text-xs text-neutral-400">{help}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Correct number of {unit}
          <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} autoFocus className="w-32 border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. physical count, bought used" className="border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm normal-case" />
        </label>
      </div>
      <div className="text-xs text-neutral-500">
        Now {current.toLocaleString()} → {Number.isFinite(n) ? Math.round(n).toLocaleString() : "?"} ({delta >= 0 ? "+" : ""}
        {delta.toLocaleString()}). Saved as a dated correction you can remove later. History stays as it is.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !Number.isFinite(n) || n < 0}
          onClick={() =>
            startTransition(async () => {
              const res = await save(n, note);
              setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "Couldn't save." });
              if (res.ok) {
                setOpen(false);
                setNote("");
              }
            })
          }
          className="bg-brand-olive px-3 py-1.5 text-xs hover:bg-brand-olive-light disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save correction"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="border border-neutral-700 px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
      {msg && !msg.ok && <span className="text-xs text-red-400">{msg.text}</span>}
    </div>
  );
}
