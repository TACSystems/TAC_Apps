"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@core/components/Icon";

type Hit = { kind: string; label: string; sub: string | null; href: string };
type Results = { query: string; groups: { kind: string; hits: Hit[] }[]; total: number };

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    let i = -1;
    return (results?.groups ?? []).map((g) => ({
      kind: g.kind,
      hits: g.hits.map((hit) => ({ hit, index: ++i })),
    }));
  }, [results]);
  const flat = useMemo(() => groups.flatMap((g) => g.hits.map((h) => h.hit)), [groups]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Results;
        setResults(data);
        setActive(0);
        setOpen(true);
      } catch {
        if (!ctrl.signal.aborted) setResults(null);
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        box.current?.focus();
        box.current?.select();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    setResults(null);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      box.current?.blur();
      return;
    }
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
      setOpen(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) go(hit);
    }
  }

  return (
    <div ref={root} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 border border-neutral-700 bg-neutral-950 px-2 focus-within:border-brand-amber">
        <Icon name="search" size={14} />
        <input
          ref={box}
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            if (next.trim().length < 2) {
              setResults(null);
              setBusy(false);
              setOpen(false);
            } else {
              setBusy(true);
            }
          }}
          onFocus={() => results && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search students, classes, courses…"
          aria-label="Search TAC-QUAL"
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-results"
          className="w-full bg-transparent py-1.5 text-xs text-neutral-200 outline-none placeholder:text-neutral-600"
        />
        <kbd className="hidden shrink-0 border border-neutral-700 px-1 text-[10px] text-neutral-500 sm:block">⌘K</kbd>
      </div>

      {open && q.trim().length >= 2 && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-[26rem] w-full overflow-auto border border-neutral-700 bg-neutral-900 py-1 shadow-xl"
        >
          {!results || results.total === 0 ? (
            <p className="px-3 py-3 text-xs normal-case text-neutral-500">
              {busy ? "Searching…" : `Nothing matches "${q.trim()}".`}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.kind}>
                <div className="px-3 pb-1 pt-2 text-[10px] tracking-[0.2em] text-neutral-500">
                  {g.kind.toUpperCase()}
                </div>
                {g.hits.map(({ hit, index }) => (
                  <button
                    key={hit.href}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(hit)}
                    className={`block w-full px-3 py-1.5 text-left text-xs ${
                      index === active ? "bg-neutral-800 text-neutral-100" : "text-neutral-300"
                    }`}
                  >
                    {hit.label}
                    {hit.sub && <span className="block text-[11px] normal-case text-neutral-500">{hit.sub}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
