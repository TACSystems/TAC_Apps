import type { StringOutcome } from "@core/lib/run-clock";

export type SavedRun = {
  v: 1;
  outcomes: Record<string, StringOutcome>;
  options: Record<string, string>;
  idx: number;
  pausedTotal: number;
  elapsed: number;
  savedAt: number;
};

/**
 * An interrupted run is only worth offering back for as long as it is plausibly
 * the same trip to the range. A week-old one is noise.
 */
const KEEP_FOR_MS = 12 * 60 * 60 * 1000;

export function saveRun(key: string, run: SavedRun) {
  try {
    window.localStorage.setItem(key, JSON.stringify(run));
  } catch {
    // Storage can be unavailable or full; a run that cannot be saved still runs.
  }
}

export function loadRun(key: string): SavedRun | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedRun;
    if (saved?.v !== 1 || !saved.outcomes || !Object.keys(saved.outcomes).length) return null;
    if (Date.now() - saved.savedAt > KEEP_FOR_MS) {
      clearRun(key);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

/**
 * A stable snapshot per key. React re-reads a store snapshot on every render
 * and loops if the value changes identity, and this one only ever changes when
 * the run is cleared.
 */
const cache = new Map<string, SavedRun | null>();

export function snapshotRun(key: string): SavedRun | null {
  if (!cache.has(key)) cache.set(key, loadRun(key));
  return cache.get(key) ?? null;
}

/** Nothing else writes this store while a run is on screen. */
export function subscribeRun() {
  return () => {};
}

export function clearRun(key: string) {
  cache.set(key, null);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: the run is over either way.
  }
}
