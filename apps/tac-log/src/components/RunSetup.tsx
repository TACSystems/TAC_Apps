"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import type { ArmoryPick, ArmorySlot } from "@/lib/previous-runs";

/**
 * Run Course is gated on choosing a firearm, because the rounds it tallies
 * are posted to that firearm's record and a shots-fired count is only worth
 * having if it is right. "Not in my Armory" is a real answer — a borrowed or
 * rented gun still shoots the course — and it records no rounds against
 * anything rather than guessing.
 *
 * A combined arms course is fired with more than one firearm, so it asks once
 * per weapon. Its rifle rounds have no business landing on a handgun's record.
 */
export default function RunSetup({
  courseId,
  courseName,
  rounds,
  slots,
  lastUsed,
}: {
  courseId: string;
  courseName: string;
  rounds: number;
  slots: ArmorySlot[];
  lastUsed: string | null;
}) {
  const multi = slots.length > 1;
  const [picked, setPicked] = useState<Record<string, string>>({});
  const header = (
    <PageHeader
      title="Run Course"
      icon="timer"
      subtitle={`${courseName} · ${rounds} rounds`}
      back={{ href: `/courses/${courseId}`, label: "Course" }}
    />
  );

  if (!multi) {
    const list = slots[0]?.matched ?? [];
    return (
      <div className="flex max-w-3xl flex-col gap-5">
        {header}
        <section className="card brk space-y-4 p-5">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide">Which firearm?</h2>
            <p className="text-sm text-neutral-400">
              The rounds this course fires are added to the firearm you pick, so its shots-fired count and cleaning
              schedule stay right.
            </p>
          </div>
          <div className="grid gap-2">
            {list.map((f) => (
              <Link
                key={f.id}
                href={`/run/${courseId}?fa=${encodeURIComponent(`:${f.id}`)}`}
                className="flex items-baseline justify-between gap-4 border border-neutral-700 px-4 py-3 hover:border-brand-amber"
              >
                <span>
                  <span className="font-bold">{f.label}</span>
                  {f.id === lastUsed ? (
                    <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-amber">Last used here</span>
                  ) : null}
                  <span className="block text-xs text-neutral-500">
                    {[f.caliber, `${f.shots_fired.toLocaleString()} rounds fired`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-widest text-neutral-500">Run →</span>
              </Link>
            ))}
            <Link
              href={`/run/${courseId}?fa=${encodeURIComponent(":none")}`}
              className="flex items-baseline justify-between gap-4 border border-dashed border-neutral-700 px-4 py-3 hover:border-brand-amber"
            >
              <span>
                <span className="font-bold">Firearm not in my Armory</span>
                <span className="block text-xs text-neutral-500">
                  Borrowed, rented or someone else&apos;s. No rounds are recorded against any firearm.
                </span>
              </span>
              <span className="text-xs uppercase tracking-widest text-neutral-500">Run →</span>
            </Link>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nothing in the Armory yet. You can still run the course — pick the option above.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const ready = slots.every((s) => picked[s.category ?? ""]);
  const query = slots
    .map((s) => `fa=${encodeURIComponent(`${s.category ?? ""}:${picked[s.category ?? ""] ?? "none"}`)}`)
    .join("&");

  const option = (slot: ArmorySlot, f: ArmoryPick) => {
    const key = slot.category ?? "";
    const on = picked[key] === f.id;
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => setPicked((p) => ({ ...p, [key]: f.id }))}
        className={`flex items-baseline justify-between gap-4 border px-4 py-3 text-left ${
          on ? "border-brand-amber bg-neutral-900" : "border-neutral-700 hover:border-brand-amber"
        }`}
      >
        <span>
          <span className="font-bold">{f.label}</span>
          {f.id === lastUsed ? (
            <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-amber">Last used here</span>
          ) : null}
          <span className="block text-xs text-neutral-500">
            {[f.caliber, f.platform, `${f.shots_fired.toLocaleString()} rounds fired`].filter(Boolean).join(" · ")}
          </span>
        </span>
        {on ? <span className="text-xs uppercase tracking-widest text-brand-amber">Picked</span> : null}
      </button>
    );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {header}
      <section className="card brk space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Which firearms?</h2>
          <p className="text-sm text-neutral-400">
            This course is fired with more than one weapon. Pick one for each, and the rounds this run tallies are
            added to that firearm.
          </p>
        </div>

        {slots.map((slot) => {
          const key = slot.category ?? "";
          return (
            <div key={key} className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.22em] text-brand-amber">{slot.category}</h3>
              <div className="grid gap-2">
                {slot.matched.map((f) => option(slot, f))}
                {slot.others.length ? (
                  <details className="border border-neutral-800 px-4 py-2">
                    <summary className="cursor-pointer text-xs uppercase tracking-widest text-neutral-500">
                      Other firearms ({slot.others.length})
                    </summary>
                    <div className="mt-2 grid gap-2">{slot.others.map((f) => option(slot, f))}</div>
                  </details>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPicked((p) => ({ ...p, [key]: "none" }))}
                  className={`flex items-baseline justify-between gap-4 border border-dashed px-4 py-3 text-left ${
                    picked[key] === "none" ? "border-brand-amber bg-neutral-900" : "border-neutral-700 hover:border-brand-amber"
                  }`}
                >
                  <span>
                    <span className="font-bold">Not in my Armory</span>
                    <span className="block text-xs text-neutral-500">
                      No rounds are recorded for this weapon.
                    </span>
                  </span>
                  {picked[key] === "none" ? (
                    <span className="text-xs uppercase tracking-widest text-brand-amber">Picked</span>
                  ) : null}
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3 border-t border-neutral-800 pt-4">
          {ready ? (
            <Link href={`/run/${courseId}?${query}`} className="btn btn-primary">
              Start Run →
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" disabled>
              Start Run →
            </button>
          )}
          <span className="text-xs text-neutral-500">
            {ready ? "Every weapon has a firearm." : "Pick a firearm for each weapon first."}
          </span>
        </div>
      </section>
    </div>
  );
}
