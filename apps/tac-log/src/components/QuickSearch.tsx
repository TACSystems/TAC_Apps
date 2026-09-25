"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quickSearch, type QuickHit } from "@/app/quick-search-actions";

export default function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [sel, setSel] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), 0);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function run(value: string) {
    setQ(value);
    const n = ++seq.current;
    startTransition(async () => {
      const res = await quickSearch(value);
      if (n === seq.current) {
        setHits(res);
        setSel(0);
      }
    });
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      run("");
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  function go(h: QuickHit | undefined) {
    if (!h) return;
    setOpen(false);
    setQ("");
    router.push(h.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="quick-search"
        className="btn btn-secondary btn-xs"
        title="Quick search"
      >
        Search <span className="text-neutral-500">{isMac ? "⌘K" : "Ctrl+K"}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[12vh] print:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Quick search" className="w-full max-w-2xl border border-brand-amber bg-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => run(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(hits.length - 1, s + 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(0, s - 1));
                }
                if (e.key === "Enter") go(hits[sel]);
              }}
              placeholder="Search firearms, serials, courses, documents, sessions, settings…"
              className="input w-full border-b text-base outline-none"
            />
            <ul className="max-h-[55vh] overflow-y-auto py-1">
              {hits.map((h, i) => (
                <li key={`${h.href}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === sel ? "bg-brand-tile" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className={i === sel ? "text-brand-amber" : ""}>{h.label}</span>
                      {h.sub && <span className="ml-2 text-xs text-neutral-500">{h.sub}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] tracking-[0.15em] text-neutral-500">{h.group.toUpperCase()}</span>
                  </button>
                </li>
              ))}
              {hits.length === 0 && q && <li className="px-4 py-3 text-sm text-neutral-500">Nothing matches &ldquo;{q}&rdquo;.</li>}
            </ul>
            <div className="border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-500">↑ ↓ to move · Enter to open · Esc to close</div>
          </div>
        </div>
      )}
    </>
  );
}
