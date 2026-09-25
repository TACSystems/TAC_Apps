"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishTour } from "@/app/tour-actions";

type Step = { target: string | null; title: string; body: string };

const STEPS: Step[] = [
  { target: null, title: "Welcome to TAC-LOG", body: "A quick look around. Use Next and Back, or press Esc to skip. Everything stays on this computer." },
  { target: "nav-home", title: "Home", body: "Your dashboard: maintenance due, ammo on hand, and recent range sessions. Click a section title to fold it away." },
  { target: "nav-armory", title: "Armory", body: "Every firearm with serials, photos, receipts, accessories, cleaning and malfunction logs. Click any row to open a firearm's profile. The Inventory Report there is ready for your insurance company." },
  { target: "nav-documents", title: "Documents", body: "Carry permits, NFA stamps, memberships, and licenses, with scans. TAC-LOG warns you before anything expires." },
  { target: "nav-ammo", title: "Ammo", body: "Goals and totals at the top, then what's on hand by caliber, type and grain. Log Purchase and Set Goal are at the top right. Rounds you fire come off the ammo you pick automatically." },
  { target: "nav-courses", title: "Courses of Fire", body: "Build or import qualification courses, tag them Handgun / Rifle / Shotgun, print scorecards, and log a range session against them." },
  { target: "nav-rangelog", title: "Range Log", body: "One line per trip to the range: session number, date, location, firearms, rounds, and course scores with PASS/FAIL. Click a session to see everything in it." },
  { target: "nav-stats", title: "Stats", body: "Score trends, pass rates by course and category, rounds per month, and ammo cost per round." },
  { target: "nav-controls", title: "Controls", body: "Customize each page: dropdown lists (calibers, platforms, course categories…), defaults, thresholds, and the dashboard layout, organized page by page." },
  { target: "nav-settings", title: "Settings", body: "Manage the app itself: security (PIN or encrypted password), backups, restore, import/export, and display options. There's a search box at the top." },
  { target: "quick-search", title: "Quick search", body: "Press Cmd/Ctrl+K anywhere to jump to a firearm (by name, nickname, or serial), course, document, session, or setting." },
  { target: "quick-actions", title: "Quick actions", body: "The most common jobs, one click away: log a range session (course of fire or practice), build a course, update rounds fired, log ammo, the par timer, and your range bag checklist." },
  { target: null, title: "You're set", body: "Start by adding a firearm or importing your spreadsheet (Settings > Import / Export). Help (in Settings › About, the File menu, or Cmd/Ctrl+K) has short guides for everything. Replay this tour any time from Settings › About or the File menu." },
];

export default function Tour({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(240);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    if (el) {
      const r0 = el.getBoundingClientRect();
      if (r0.top < 80 || r0.bottom > window.innerHeight - 80) el.scrollIntoView({ block: "center" });
      setRect(el.getBoundingClientRect());
    } else setRect(null);
  }, [step.target]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      measure();
      if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    });
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
  const below = rect ? rect.bottom + pad + 10 : 0;
  const above = rect ? rect.top - pad - 10 - cardH : 0;
  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.max(
          16,
          below + cardH <= window.innerHeight - 16 ? below : above >= 16 ? above : window.innerHeight - cardH - 16
        ),
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
      <div ref={cardRef} className="fixed w-[380px] max-w-[calc(100vw-32px)] border border-brand-amber bg-neutral-900 p-4 shadow-xl" style={cardStyle}>
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
              <button type="button" onClick={() => setI(i - 1)} className="btn btn-secondary">
                Back
              </button>
            )}
            {i < STEPS.length - 1 ? (
              <button type="button" onClick={() => setI(i + 1)} className="btn btn-primary">
                Next
              </button>
            ) : (
              <button type="button" onClick={close} className="btn btn-primary">
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
