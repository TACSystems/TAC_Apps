"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerString = {
  label: string;
  phase: string;
  par: number | null;
  details: string[];
};

type Phase = "idle" | "standby" | "running" | "done";

let ctx: AudioContext | null = null;

function beep(freq: number, ms: number, volume = 0.6) {
  try {
    ctx = ctx ?? new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {}
}

function fmt(ms: number) {
  const s = Math.max(0, ms) / 1000;
  return s < 60 ? s.toFixed(2) : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

export default function ParTimer({ strings, title }: { strings: TimerString[] | null; title?: string }) {
  const free = !strings || strings.length === 0;
  const [idx, setIdx] = useState(0);
  const [freePar, setFreePar] = useState("3");
  const [delayMin, setDelayMin] = useState("1");
  const [delayMax, setDelayMax] = useState("4");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [parHit, setParHit] = useState(false);
  const timers = useRef<number[]>([]);
  const startAt = useRef(0);
  const raf = useRef<number | null>(null);

  const current = free ? null : strings![idx];
  const par = free ? (Number(freePar) > 0 ? Number(freePar) : null) : current?.par ?? null;

  const clearAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  useEffect(() => clearAll, [clearAll]);

  const tick = useCallback(() => {
    const loop = () => {
      setElapsed(performance.now() - startAt.current);
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  const stop = useCallback(() => {
    clearAll();
    setPhase((p) => (p === "running" ? "done" : "idle"));
  }, [clearAll]);

  const start = useCallback(() => {
    clearAll();
    setParHit(false);
    setElapsed(0);
    setPhase("standby");
    const lo = Math.max(0, Number(delayMin) || 0);
    const hi = Math.max(lo, Number(delayMax) || lo);
    const delay = (lo + Math.random() * (hi - lo)) * 1000;
    timers.current.push(
      window.setTimeout(() => {
        beep(1800, 350);
        startAt.current = performance.now();
        setPhase("running");
        tick();
        if (par) {
          timers.current.push(
            window.setTimeout(() => {
              beep(1100, 600);
              setParHit(true);
              if (raf.current) cancelAnimationFrame(raf.current);
              raf.current = null;
              setElapsed(par * 1000);
              setPhase("done");
            }, par * 1000)
          );
        }
      }, delay)
    );
  }, [clearAll, delayMin, delayMax, par, tick]);

  const go = useCallback(
    (d: number) => {
      if (free) return;
      clearAll();
      setPhase("idle");
      setElapsed(0);
      setParHit(false);
      setIdx((i) => Math.max(0, Math.min(strings!.length - 1, i + d)));
    },
    [clearAll, free, strings]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "standby" || phase === "running") stop();
        else start();
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start, stop, go]);

  const big =
    phase === "standby" ? "STANDBY" : phase === "idle" ? (par ? `PAR ${par}s` : "NO PAR") : fmt(elapsed);
  const color =
    phase === "standby" ? "text-amber-300" : parHit ? "text-red-400" : phase === "running" ? "text-green-400" : "text-neutral-200";

  const input = "w-20 border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm";

  return (
    <div className="flex flex-col gap-4">
      {!free && current && (
        <div className="border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs tracking-[0.2em] text-neutral-500">
            {current.phase} · STRING {idx + 1} OF {strings!.length}
          </div>
          <div className="mt-1 text-lg text-brand-amber">{current.label}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-300">
            {current.details.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-2 border border-neutral-800 bg-neutral-950 py-10">
        <div className={`font-mono text-6xl tabular-nums sm:text-8xl ${color}`} aria-live="polite">
          {big}
        </div>
        {phase === "done" && (
          <div className={`text-sm ${parHit ? "text-red-300" : "text-neutral-400"}`}>
            {parHit ? `Par time (${par}s) reached` : `Stopped at ${fmt(elapsed)}${par ? ` · par ${par}s` : ""}`}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!free && (
          <button type="button" onClick={() => go(-1)} disabled={idx === 0} className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40">
            ← Prev
          </button>
        )}
        {phase === "standby" || phase === "running" ? (
          <button type="button" onClick={stop} className="min-w-[10rem] border border-red-900 bg-red-950 px-6 py-3 text-base text-red-200 hover:bg-red-900">
            Stop (Space)
          </button>
        ) : (
          <button type="button" onClick={start} className="min-w-[10rem] bg-brand-olive px-6 py-3 text-base hover:bg-brand-olive-light">
            {phase === "done" ? "Repeat (Space)" : "Start (Space)"}
          </button>
        )}
        {!free && (
          <button type="button" onClick={() => go(1)} disabled={idx >= strings!.length - 1} className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40">
            Next →
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
        {free && (
          <label className="flex items-center gap-2">
            Par (seconds)
            <input type="number" min={0} step="0.1" value={freePar} onChange={(e) => setFreePar(e.target.value)} className={input} />
          </label>
        )}
        <label className="flex items-center gap-2">
          Random start delay
          <input type="number" min={0} step="0.5" value={delayMin} onChange={(e) => setDelayMin(e.target.value)} className={input} />
          to
          <input type="number" min={0} step="0.5" value={delayMax} onChange={(e) => setDelayMax(e.target.value)} className={input} />
          sec
        </label>
        <span>{title ? `${title} · ` : ""}Space starts/stops · ← → change string</span>
      </div>
      <p className="text-center text-xs text-neutral-500">
        This is a par timer: it beeps to start and again at the par time. It doesn&apos;t hear shots, so use a shot timer if you
        need split times.
      </p>
    </div>
  );
}
