"use client";

import type { Clock } from "@core/lib/run-clock";

/**
 * The browser end of the run clock. Tones are scheduled at absolute
 * AudioContext times rather than played on a timer, so the beep the shooter
 * hears and the time we record are the same event.
 */
export function createAudioClock(): Clock & { resume(): Promise<void>; close(): void } {
  let ctx: AudioContext | null = null;

  const get = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  };

  return {
    now: () => {
      try {
        return get().currentTime;
      } catch {
        return performance.now() / 1000;
      }
    },
    tone: (at, freq, ms) => {
      try {
        const c = get();
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "square";
        o.frequency.value = freq;
        // A hard gate on a square wave clicks; a 5ms ramp does not.
        const t = Math.max(at, c.currentTime);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.6, t + 0.005);
        g.gain.setValueAtTime(0.6, t + ms / 1000 - 0.005);
        g.gain.linearRampToValueAtTime(0, t + ms / 1000);
        o.connect(g);
        g.connect(c.destination);
        o.start(t);
        o.stop(t + ms / 1000 + 0.01);
      } catch {}
    },
    // Browsers start an AudioContext suspended until a gesture, and a
    // suspended context's clock does not advance.
    resume: async () => {
      try {
        const c = get();
        if (c.state === "suspended") await c.resume();
      } catch {}
    },
    close: () => {
      try {
        ctx?.close();
      } catch {}
      ctx = null;
    },
  };
}
