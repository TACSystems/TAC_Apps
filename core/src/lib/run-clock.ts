/**
 * The engine behind Run Course.
 *
 * Everything is scheduled against an audio clock rather than setTimeout,
 * because setTimeout drifts 5-30ms under load and the recorded time of a
 * string has to agree with the beep the shooter actually heard. The clock
 * is injected so the whole thing is testable without a browser.
 */

export type RunMode = "par" | "countdown" | "stopwatch";

export type RunString = {
  id: string;
  label: string;
  phase: string;
  /** Seconds, or null for a string with no par ("SLOW FIRE"). */
  par: number | null;
  rounds: number | null;
  /** The weapons this string is fired with, in the order its rounds cell is read. */
  weapons?: string[];
  /** One count per weapon, parallel to `weapons`. Their sum is `rounds`. */
  roundParts?: (number | null)[];
  details: string[];
};

export type StringOutcome = {
  id: string;
  /** Seconds from this string's start beep to its end beep, null when skipped. */
  elapsed: number | null;
  skipped: boolean;
  /** Attempts before the one that counted. */
  reruns: number;
};

export type RunPhase = "idle" | "standby" | "live" | "over" | "paused" | "done";

export type Clock = {
  /** Monotonic seconds. AudioContext.currentTime in the browser. */
  now(): number;
  /** Plays a tone at an absolute clock time. */
  tone(at: number, freq: number, ms: number): void;
};

export const START_TONE = 800;
export const END_TONE = 500;

/**
 * Two tones, not one. On a bay running three lanes a single beep sound is
 * ambiguous — you hear a beep and cannot tell whose, or which end of it.
 */
export function toneFor(edge: "start" | "end") {
  return edge === "start" ? START_TONE : END_TONE;
}

export function standbyDelay(min: number, max: number, random: () => number = Math.random) {
  const lo = Math.max(0, min);
  const hi = Math.max(lo, max);
  return lo + random() * (hi - lo);
}

/**
 * A stopwatch string counts down and beeps at both ends, same as a par
 * string; the difference is that a par is the course's own limit while a
 * countdown is one the instructor set for this run.
 */
export function limitFor(mode: RunMode, str: RunString, manualSeconds: number | null): number | null {
  if (mode === "stopwatch") return null;
  if (mode === "countdown") return manualSeconds && manualSeconds > 0 ? manualSeconds : null;
  return str.par;
}

export type Scheduled = { startAt: number; endAt: number | null };

/** Books both tones up front, so the end tone cannot drift away from the start. */
export function schedule(clock: Clock, delay: number, limit: number | null): Scheduled {
  const startAt = clock.now() + delay;
  const endAt = limit === null ? null : startAt + limit;
  clock.tone(startAt, START_TONE, 350);
  if (endAt !== null) clock.tone(endAt, END_TONE, 600);
  return { startAt, endAt };
}

export function phaseAt(now: number, s: Scheduled, paused: boolean): RunPhase {
  if (paused) return "paused";
  if (now < s.startAt) return "standby";
  if (s.endAt === null) return "live";
  return now < s.endAt ? "live" : "over";
}

/** Seconds since the start beep, clamped at zero before it sounds. */
export function elapsedAt(now: number, s: Scheduled) {
  return Math.max(0, now - s.startAt);
}

/** How far past the limit, or null while still inside it. */
export function overBy(now: number, s: Scheduled) {
  if (s.endAt === null || now < s.endAt) return null;
  return now - s.endAt;
}

export function remainingAt(now: number, s: Scheduled) {
  if (s.endAt === null) return null;
  return Math.max(0, s.endAt - now);
}

/**
 * The course clock runs from the first beep of the first string to the last
 * beep of the last one (Brad, 2026-09-27), minus any time spent paused —
 * a cease fire is not shooting time.
 */
export function courseElapsed(
  firstBeepAt: number | null,
  lastBeepAt: number | null,
  now: number,
  pausedTotal: number
) {
  if (firstBeepAt === null) return 0;
  const end = lastBeepAt ?? now;
  return Math.max(0, end - firstBeepAt - pausedTotal);
}

export function totalRounds(strings: RunString[], outcomes: Record<string, StringOutcome>) {
  return strings.reduce((n, s) => {
    const o = outcomes[s.id];
    if (!o || o.skipped) return n;
    return n + (s.rounds ?? 0);
  }, 0);
}

export type WeaponTally = { weapon: string | null; rounds: number };

/**
 * Rounds split the way they will be posted: one bucket per weapon, in the
 * order the weapons first appear in the course. A string with no weapon named
 * falls in the unnamed bucket, which is the whole course on a single-weapon
 * one. Skipped strings count for nothing, the same as the running tally.
 */
export function roundsByWeapon(strings: RunString[], outcomes: Record<string, StringOutcome>): WeaponTally[] {
  const order: (string | null)[] = [];
  const sums = new Map<string, number>();
  const add = (weapon: string | null, n: number) => {
    const key = weapon ?? "";
    if (!sums.has(key)) order.push(weapon);
    sums.set(key, (sums.get(key) ?? 0) + n);
  };
  for (const s of strings) {
    const o = outcomes[s.id];
    if (!o || o.skipped) continue;
    const weapons = s.weapons ?? [];
    if (weapons.length < 2) {
      add(weapons[0] ?? null, s.rounds ?? 0);
      continue;
    }
    const parts = s.roundParts ?? [];
    weapons.forEach((w, i) => add(w, parts[i] ?? 0));
  }
  return order.map((weapon) => ({ weapon, rounds: sums.get(weapon ?? "") ?? 0 }));
}

export function nextIndex(strings: RunString[], from: number) {
  return Math.min(strings.length - 1, from + 1);
}

export function isComplete(strings: RunString[], outcomes: Record<string, StringOutcome>) {
  return strings.length > 0 && strings.every((s) => outcomes[s.id] !== undefined);
}

export function fmtSeconds(s: number) {
  if (s < 60) return s.toFixed(1);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

export function fmtClock(s: number) {
  const whole = Math.floor(Math.max(0, s));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const sec = whole % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
