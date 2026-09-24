"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { finishTour } from "@/app/tour-actions";

type Step = { target: string | null; title: string; body: string };

const STEPS: Step[] = [
  { target: null, title: "Welcome to TAC-LOG", body: "A quick look around. Use Next and Back, or press Esc to skip. Everything stays on this computer." },
  { target: "nav-home", title: "Home", body: "Your dashboard: maintenance due, ammo on hand, and recent range sessions. Click a section title to fold it away." },
  { target: "nav-armory", title: "Armory", body: "Every firearm with serials, photos, receipts, accessories, cleaning and malfunction logs. Click any row to open a firearm's profile. The Inventory Report there is ready for your insurance company." },
  { target: "nav-ammo", title: "Ammo", body: "Log purchases with lot numbers and prices, and set a goal per caliber. Rounds you fire come off what's on hand automatically." },
  { target: "nav-courses", title: "Courses of Fire", body: "Build or import qualification courses, tag them Handgun / Rifle / Shotgun, print scorecards, and log a range session against them." },
  { target: "nav-rangelog", title: "Range Log", body: "Every session you've shot, with scores and PASS/FAIL. Click a row to see or edit it." },
  { target: "nav-stats", title: "Stats", body: "Score trends, pass rates by course and category, rounds per month, and ammo cost per round." },
  { target: "nav-controls", title: "Controls", body: "Customize the dropdown lists (calibers, platforms, course categories, and so on) and choose what the dashboard shows." },
  { target: "nav-settings", title: "Settings", body: "Security (PIN or encrypted password), backups, imports, defaults, and display options. There's a search box at the top." },
  { target: "quick-actions", title: "Quick actions", body: "The most common jobs, one click away: log a range session, build a course, update rounds fired, log an ammo purchase." },
  { target: null, title: "You're set", body: "Start by adding a firearm or importing your spreadsheet (Settings > Import / Export). Replay this tour any time from Settings > About or the File menu." },
];

export default function Tour({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      setRect(el.getBoundingClientRect());
    } else setRect(null);
  }, [step.target]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure]);

  const close = useCallback(async () => {
    await finishTour();
    onDone?.();
    router.replace("/");
  }, [onDone, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "Enter") setI((n) => Math.min(STEPS.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
    };
  }, [close, measure]);

  const pad = 6;
  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.bottom + pad + 10, window.innerHeight - 220),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 400)),
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[60] print:hidden" role="dialog" aria-modal="true" aria-label="TAC-LOG tour">
      {rect ? (
        <div
          className="pointer-events-none fixed border-2 border-brand-amber transition-all"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/70" />
      )}
      <div className="fixed w-[380px] max-w-[calc(100vw-32px)] border border-brand-amber bg-neutral-900 p-4 shadow-xl" style={cardStyle}>
        <div className="mb-1 text-[10px] tracking-[0.25em] text-neutral-500">
          STEP {i + 1} OF {STEPS.length}
        </div>
        <h2 className="mb-2 text-brand-amber">{step.title}</h2>
        <p className="mb-4 text-sm text-neutral-200">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={close} className="text-xs text-neutral-500 underline hover:text-neutral-300">
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800">
                Back
              </button>
            )}
            {i < STEPS.length - 1 ? (
              <button type="button" onClick={() => setI(i + 1)} className="bg-brand-olive px-4 py-1.5 text-sm hover:bg-brand-olive-light">
                Next
              </button>
            ) : (
              <button type="button" onClick={close} className="bg-brand-olive px-4 py-1.5 text-sm hover:bg-brand-olive-light">
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
