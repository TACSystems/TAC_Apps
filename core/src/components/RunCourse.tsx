"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  courseElapsed,
  elapsedAt,
  fmtClock,
  fmtSeconds,
  isComplete,
  limitFor,
  overBy,
  phaseAt,
  remainingAt,
  schedule,
  standbyDelay,
  totalRounds,
  type RunMode,
  type RunPhase,
  type RunString,
  roundsByWeapon,
  type WeaponTally,
  type Scheduled,
  type StringOutcome,
} from "@core/lib/run-clock";
import { createAudioClock } from "@core/lib/run-audio";
import RunTally from "@core/components/RunTally";

export type RunCourseProps = {
  app: string;
  courseName: string;
  courseCode?: string | null;
  strings: RunString[];
  /** Options a phase offers, chosen at the start of that phase. */
  phaseOptions?: Record<string, string[]>;
  contextLabel?: string;
  /** The bottom-right panel: relay in TAC-QUAL, previous run in TAC-LOG. */
  children?: ReactNode;
  exitHref: string;
  onFinish?: (summary: RunSummary) => void;
  /** What each weapon's rounds post to, keyed by weapon ("" for an unnamed one). */
  destinations?: Record<string, string>;
  dryFire?: boolean;
};

export type RunSummary = {
  outcomes: StringOutcome[];
  courseSeconds: number;
  pausedSeconds: number;
  rounds: number;
  /** As accepted on the tally, which is not always as counted. */
  byWeapon: WeaponTally[];
  corrected: boolean;
  options: Record<string, string>;
  dryFire: boolean;
};

const MODES: { key: RunMode; label: string }[] = [
  { key: "par", label: "Par" },
  { key: "countdown", label: "Countdown" },
  { key: "stopwatch", label: "Stopwatch" },
];

export default function RunCourse({
  app,
  courseName,
  courseCode,
  strings,
  phaseOptions = {},
  contextLabel,
  children,
  exitHref,
  onFinish,
  destinations = {},
  dryFire = false,
}: RunCourseProps) {
  const clock = useMemo(() => createAudioClock(), []);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<RunMode>("par");
  const [manual, setManual] = useState(30);
  const [sched, setSched] = useState<Scheduled | null>(null);
  const [now, setNow] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, StringOutcome>>({});
  const [options, setOptions] = useState<Record<string, string>>({});
  const [paused, setPaused] = useState(false);
  const [tally, setTally] = useState<{ seconds: number; paused: number; byWeapon: WeaponTally[] } | null>(null);
  const [dry, setDry] = useState(dryFire);
  const [wall, setWall] = useState(() => new Date());
  const [showPrev, setShowPrev] = useState(false);

  const [firstBeep, setFirstBeep] = useState<number | null>(null);
  const [lastBeep, setLastBeep] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const pausedAt = useRef<number | null>(null);
  const reruns = useRef<Record<string, number>>({});
  const raf = useRef<number | null>(null);

  const current = strings[idx];
  const limit = current ? limitFor(mode, current, manual) : null;
  const phase: RunPhase = sched ? phaseAt(now, sched, paused) : "idle";
  const done = isComplete(strings, outcomes);

  useEffect(() => {
    const loop = () => {
      setNow(clock.now());
      raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [clock]);

  useEffect(() => {
    const t = window.setInterval(() => setWall(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    window.taclog?.keepAwake?.(true);
    return () => {
      window.taclog?.keepAwake?.(false);
      clock.close();
    };
  }, [clock]);

  const record = useCallback(
    (elapsed: number | null, skipped: boolean) => {
      const s = strings[idx];
      if (!s) return;
      setOutcomes((o) => ({
        ...o,
        [s.id]: { id: s.id, elapsed, skipped, reruns: reruns.current[s.id] ?? 0 },
      }));
    },
    [idx, strings]
  );

  const arm = useCallback(async () => {
    if (!current) return;
    await clock.resume();
    const delay = standbyDelay(1, 4);
    const s = schedule(clock, delay, limit);
    setFirstBeep((f) => (f === null ? s.startAt : f));
    if (s.endAt !== null) setLastBeep(s.endAt);
    setSched(s);
  }, [clock, current, limit]);

  const advance = useCallback(async () => {
    if (!current) return;
    if (sched) {
      const spent = limit === null ? elapsedAt(clock.now(), sched) : limit;
      record(spent, false);
      if (idx >= strings.length - 1) {
        setSched(null);
        return;
      }
      setIdx((i) => i + 1);
      setSched(null);
      return;
    }
    await arm();
  }, [arm, clock, current, idx, limit, record, sched, strings.length]);

  const skip = useCallback(() => {
    if (!current) return;
    record(null, true);
    setSched(null);
    if (idx < strings.length - 1) setIdx((i) => i + 1);
  }, [current, idx, record, strings.length]);

  const rerun = useCallback(() => {
    if (!current) return;
    reruns.current[current.id] = (reruns.current[current.id] ?? 0) + 1;
    setSched(null);
    setOutcomes((o) => {
      const next = { ...o };
      delete next[current.id];
      return next;
    });
  }, [current]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (!p) {
        pausedAt.current = clock.now();
        return true;
      }
      if (pausedAt.current !== null) {
        const spent = clock.now() - pausedAt.current;
        setPausedTotal((t) => t + spent);
      }
      pausedAt.current = null;
      return false;
    });
  }, [clock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tally) return;
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === " " || e.code === "Space") {
        e.preventDefault();
        void advance();
      } else if (k === "r") rerun();
      else if (k === "s") skip();
      else if (k === "p") togglePause();
      else if (k === "v") setShowPrev((v) => !v);
      else if (k === "d") setDry((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, rerun, skip, tally, togglePause]);

  const finished = useRef(false);
  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    setTally({
      seconds: courseElapsed(firstBeep, lastBeep, clock.now(), pausedTotal),
      paused: pausedTotal,
      byWeapon: roundsByWeapon(strings, outcomes),
    });
  }, [clock, done, firstBeep, lastBeep, outcomes, pausedTotal, strings]);

  const counted = strings.map((s) => outcomes[s.id]).filter(Boolean);
  const acceptTally = (edited: WeaponTally[]) => {
    const before = tally?.byWeapon ?? [];
    // Until the scoring handoff is wired, accepting still has to go somewhere
    // rather than leave the tally on screen with nothing to press.
    if (!onFinish) {
      window.location.assign(exitHref);
      return;
    }
    onFinish({
      outcomes: counted,
      courseSeconds: tally?.seconds ?? 0,
      pausedSeconds: tally?.paused ?? 0,
      rounds: edited.reduce((n, t) => n + t.rounds, 0),
      byWeapon: edited,
      corrected: edited.some((t, i) => t.rounds !== before[i]?.rounds),
      options,
      dryFire: dry,
    });
  };

  const frame =
    phase === "live" ? "var(--run-live)" : phase === "over" ? "var(--run-over)" : phase === "standby" || phase === "paused" ? "var(--tl-amber)" : "transparent";

  const bigValue = () => {
    if (!sched) return limit === null ? "—" : fmtSeconds(limit);
    if (phase === "standby") return limit === null ? "—" : fmtSeconds(limit);
    const over = overBy(now, sched);
    if (over !== null) return `+${fmtSeconds(over)}`;
    const left = remainingAt(now, sched);
    return left === null ? fmtSeconds(elapsedAt(now, sched)) : fmtSeconds(left);
  };

  const progress = () => {
    if (!sched || limit === null) return 0;
    const left = remainingAt(now, sched) ?? 0;
    if (phase === "standby") return 100;
    return Math.max(0, Math.min(100, (left / limit) * 100));
  };

  const stateLine = () => {
    if (!current) return "COURSE COMPLETE";
    if (paused) return `STRING ${idx + 1} — PAUSED`;
    if (!sched) return `STRING ${idx + 1} — READY`;
    if (phase === "standby") return `STRING ${idx + 1} — STAND BY`;
    if (phase === "over") return `STRING ${idx + 1} — PAR EXPIRED`;
    return `STRING ${idx + 1} — LIVE`;
  };

  const phaseStarts = useMemo(() => {
    const out: Record<string, boolean> = {};
    let seen = "";
    for (const s of strings) {
      out[s.id] = s.phase !== seen;
      seen = s.phase;
    }
    return out;
  }, [strings]);

  return (
    <div className="run-course" data-phase={phase}>
      <div className="run-frame" style={{ borderColor: frame }} />

      <header className="run-strip">
        <span className="run-app">{app}</span>
        <span className="run-name">{courseName}</span>
        {courseCode ? <span className="run-code">{courseCode}</span> : null}
        <span className="run-spacer" />
        {dry ? <span className="run-pill run-dry">DRY FIRE — NOTHING RECORDED</span> : null}
        {contextLabel ? <span className="run-pill">{contextLabel}</span> : null}
      </header>

      <div className="run-body">
        <section className="run-cof">
          <div className="run-cof-head">
            <h1>Course of Fire</h1>
            <span className="run-lbl">
              {strings.length} string{strings.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="run-cof-list">
            {strings.map((s, i) => {
              const o = outcomes[s.id];
              const active = i === idx && !done;
              const showPhase = phaseStarts[s.id];
              return (
                <div key={s.id}>
                  {showPhase && s.phase ? (
                    <div className="run-phase">
                      <span>{s.phase}</span>
                      {phaseOptions[s.phase]?.length ? (
                        <select
                          className="run-option"
                          value={options[s.phase] ?? ""}
                          onChange={(e) => setOptions((p) => ({ ...p, [s.phase]: e.target.value }))}
                        >
                          <option value="">Choose option…</option>
                          {phaseOptions[s.phase].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    className={`run-str${active ? " run-str-active brk" : ""}${o ? (o.skipped ? " run-str-skip" : " run-str-done") : ""}`}
                  >
                    <div className="run-n">{i + 1}</div>
                    <div>
                      <div className="run-d">{s.label}</div>
                      <div className="run-sub">
                        {o?.skipped
                          ? "SKIPPED"
                          : o?.elapsed != null
                            ? `${s.details.join(" · ")}${s.details.length ? " · " : ""}${fmtSeconds(o.elapsed)}s`
                            : s.details.join(" · ")}
                      </div>
                    </div>
                    <div className="run-par">{s.par === null ? "SLOW FIRE" : `${fmtSeconds(s.par)}s`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="run-right">
          <div className="run-clocks">
            <div className="run-box">
              <div className="run-lbl">Local time</div>
              <div className="run-v">{wall.toLocaleTimeString()}</div>
            </div>
            <div className="run-box">
              <div className="run-lbl">Course elapsed</div>
              <div className="run-v">
                {fmtClock(courseElapsed(firstBeep, done ? lastBeep : null, now, pausedTotal))}
              </div>
            </div>
          </div>

          <div className="run-par-panel brk">
            <div className="run-modes">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={m.key === mode ? "on" : ""}
                  onClick={() => {
                    setMode(m.key);
                    setSched(null);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === "countdown" ? (
              <label className="run-manual">
                Seconds
                <input
                  type="number"
                  min={1}
                  max={3600}
                  value={manual}
                  onChange={(e) => setManual(Number(e.target.value) || 0)}
                />
              </label>
            ) : null}
            <div className="run-state">{stateLine()}</div>
            <div className={`run-big${phase === "live" ? " live" : phase === "over" ? " over" : ""}`}>{bigValue()}</div>
            <div className="run-of">
              {limit === null ? "NO PAR — RUNS UNTIL YOU ADVANCE" : `OF ${fmtSeconds(limit)} SECONDS`}
            </div>
            <div className="run-bar">
              <i style={{ width: `${progress()}%` }} />
            </div>
          </div>

          <div className="run-bottom" data-open={showPrev ? "1" : "0"}>
            {children}
          </div>
        </section>
      </div>

      <footer className="run-foot">
        <span>
          <kbd>SPACE</kbd>
          {sched ? "NEXT STRING" : "START STRING"}
        </span>
        <span>
          <kbd>R</kbd>RE-RUN
        </span>
        <span>
          <kbd>S</kbd>SKIP
        </span>
        <span>
          <kbd>P</kbd>
          {paused ? "RESUME" : "PAUSE"}
        </span>
        <span>
          <kbd>D</kbd>DRY FIRE
        </span>
        <span className="run-spacer" />
        <span>
          STRING {Math.min(idx + 1, strings.length)} OF {strings.length} · {totalRounds(strings, outcomes)} FIRED
        </span>
        <a className="run-exit" href={exitHref}>
          ESC EXIT
        </a>
      </footer>

      {tally ? (
        <RunTally
          courseName={courseName}
          courseCode={courseCode}
          elapsed={tally.seconds}
          fired={counted.filter((o) => !o.skipped).length}
          skipped={counted.filter((o) => o.skipped).length}
          reruns={counted.reduce((n, o) => n + o.reruns, 0)}
          tallies={tally.byWeapon}
          destinations={destinations}
          dryFire={dry}
          onAccept={acceptTally}
          onDiscard={() => window.location.assign(exitHref)}
        />
      ) : null}
    </div>
  );
}
