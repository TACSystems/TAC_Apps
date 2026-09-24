"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRangeDay, type DayRow } from "@/app/range-day/actions";
import { useUnsaved, clearUnsaved } from "@/components/UnsavedGuard";

type F = { id: string; label: string; caliber: string | null };
type C = { id: string; name: string };

const input = "border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm normal-case";

function blank(): DayRow {
  return { firearmId: "", rounds: 0, caliber: "", ammoLot: "", deduct: true, courseId: "", score: "", notes: "" };
}

export default function RangeDay({
  firearms,
  courses,
  calibers,
  locations,
  weather,
  defaults,
}: {
  firearms: F[];
  courses: C[];
  calibers: string[];
  locations: string[];
  weather: string[];
  defaults: { date: string; location: string; shooter: string; deduct: boolean };
}) {
  const router = useRouter();
  const [header, setHeader] = useState({ date: defaults.date, location: defaults.location, weather: "", shooter: defaults.shooter, notes: "" });
  const [rows, setRows] = useState<DayRow[]>([{ ...blank(), deduct: defaults.deduct }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = rows.some((r) => r.firearmId || r.rounds);
  useUnsaved(dirty && !msg?.ok);

  const set = (i: number, patch: Partial<DayRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const total = rows.reduce((s, r) => s + (Number(r.rounds) || 0), 0);
  const noCal = rows.filter((r) => r.firearmId && Number(r.rounds) > 0 && !(r.caliber || firearms.find((f) => f.id === r.firearmId)?.caliber)).length;
  const byCal = new Map<string, number>();
  for (const r of rows) {
    const cal = r.caliber || firearms.find((f) => f.id === r.firearmId)?.caliber || "";
    if (cal && r.deduct && Number(r.rounds) > 0) byCal.set(cal, (byCal.get(cal) ?? 0) + Number(r.rounds));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 border border-neutral-800 bg-neutral-900 p-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Range / Location
          <input list="rd-locations" value={header.location} onChange={(e) => setHeader({ ...header, location: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Weather
          <input list="rd-weather" value={header.weather} onChange={(e) => setHeader({ ...header, weather: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Shooter
          <input value={header.shooter} onChange={(e) => setHeader({ ...header, shooter: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-4">
          Trip notes
          <input value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} placeholder="Optional" className={input} />
        </label>
        <datalist id="rd-locations">{locations.map((o) => <option key={o} value={o} />)}</datalist>
        <datalist id="rd-weather">{weather.map((o) => <option key={o} value={o} />)}</datalist>
        <datalist id="rd-calibers">{calibers.map((o) => <option key={o} value={o} />)}</datalist>
      </div>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs text-neutral-400">
            <tr>
              <th className="px-2 py-2">Firearm</th>
              <th className="px-2 py-2">Rounds</th>
              <th className="px-2 py-2">Caliber</th>
              <th className="px-2 py-2">Ammo Lot</th>
              <th className="px-2 py-2">Deduct Ammo</th>
              <th className="px-2 py-2">Course (optional)</th>
              <th className="px-2 py-2">Score %</th>
              <th className="px-2 py-2">Notes</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const f = firearms.find((x) => x.id === r.firearmId);
              return (
                <tr key={i} className="border-t border-neutral-800 align-top">
                  <td className="px-2 py-1.5">
                    <select value={r.firearmId} onChange={(e) => set(i, { firearmId: e.target.value })} className={`${input} min-w-[12rem]`}>
                      <option value="">— Select —</option>
                      {firearms.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} value={r.rounds || ""} onChange={(e) => set(i, { rounds: Number(e.target.value) })} className={`${input} w-24`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="rd-calibers" value={r.caliber} placeholder={f?.caliber ?? ""} onChange={(e) => set(i, { caliber: e.target.value })} className={`${input} w-28`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.ammoLot} onChange={(e) => set(i, { ammoLot: e.target.value })} className={`${input} w-28`} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={r.courseId ? true : r.deduct}
                      disabled={Boolean(r.courseId)}
                      title={r.courseId ? "Scored sessions always count against ammo on hand" : undefined}
                      onChange={(e) => set(i, { deduct: e.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.courseId} onChange={(e) => set(i, { courseId: e.target.value })} className={`${input} min-w-[10rem]`}>
                      <option value="">— Practice —</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={100} step="any" disabled={!r.courseId} value={r.score} onChange={(e) => set(i, { score: e.target.value })} className={`${input} w-20 disabled:opacity-40`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.notes} onChange={(e) => set(i, { notes: e.target.value })} className={`${input} w-40`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => setRows(rows.length > 1 ? rows.filter((_, k) => k !== i) : [blank()])} className="border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:text-red-300" title="Remove row">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows([...rows, { ...blank(), deduct: defaults.deduct }])} className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700">
          + Add Firearm
        </button>
        {noCal > 0 && (
          <span className="text-xs text-amber-300">
            {noCal} row{noCal === 1 ? " has" : "s have"} no caliber, so {noCal === 1 ? "it" : "they"} won&apos;t come off ammo on hand.
          </span>
        )}
        <span className="text-sm text-neutral-400">
          {total.toLocaleString()} rounds total
          {byCal.size > 0 && ` · deducts ${[...byCal.entries()].map(([c, n]) => `${n.toLocaleString()} ${c}`).join(", ")}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveRangeDay(header, rows);
              if (res.ok) {
                clearUnsaved();
                setMsg({ ok: true, text: `Saved ${res.saved} firearm${res.saved === 1 ? "" : "s"}${res.sessions ? `, including ${res.sessions} scored session${res.sessions === 1 ? "" : "s"}` : ""}.` });
                setRows([{ ...blank(), deduct: defaults.deduct }]);
                router.refresh();
              } else setMsg({ ok: false, text: res.error ?? "Couldn't save." });
            })
          }
          className="bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Range Day"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>
            {msg.text} {msg.ok && <Link href="/range-log" className="text-brand-amber underline">View Range Log</Link>}
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        Practice rows go into each firearm&apos;s Rounds Fired log. Rows with a course become range sessions with the score you
        enter; to score zone by zone, use Log a Range Session on the course instead.
      </p>
    </div>
  );
}
