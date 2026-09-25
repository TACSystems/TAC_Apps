"use client";

import { useEffect, useState } from "react";
import { saveDashboardAll } from "@/app/dashboard-actions";
import { savePageSectionsAll } from "@/app/page-section-actions";

function sections(scope: string) {
  return Array.from(document.querySelectorAll<HTMLDetailsElement>(`[data-scope="${scope}"] details[data-section]`));
}

export default function SectionTools({
  scope,
  search = false,
  persist = false,
  remember = false,
  placeholder = "Search settings (e.g. backup, PIN, date format)…",
}: {
  scope: string;
  search?: boolean;
  persist?: boolean;
  remember?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<number | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: "start" });
    }
  }, []);

  function setAll(open: boolean) {
    const list = sections(scope);
    for (const d of list) {
      d.dataset.bulk = "1";
      d.open = open;
      d.style.display = "";
      setTimeout(() => delete d.dataset.bulk, 0);
    }
    if (persist) saveDashboardAll(list.map((d) => d.dataset.section ?? ""), open);
    if (remember) savePageSectionsAll(scope, list.map((d) => d.dataset.section ?? ""), open);
    setQ("");
    setHits(null);
  }

  function filter(value: string) {
    setQ(value);
    const needle = value.trim().toLowerCase();
    let n = 0;
    for (const d of sections(scope)) {
      if (!needle) {
        d.style.display = "";
        continue;
      }
      const match = `${d.dataset.keywords ?? ""} ${d.textContent ?? ""}`.toLowerCase().includes(needle);
      d.style.display = match ? "" : "none";
      if (match) {
        n += 1;
        d.open = true;
      }
    }
    setHits(needle ? n : null);
  }

  const btn = "border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <input
          value={q}
          onChange={(e) => filter(e.target.value)}
          placeholder={placeholder}
          className="min-w-[16rem] flex-1 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
      )}
      {hits !== null && <span className="text-xs text-neutral-500">{hits ? `${hits} match${hits === 1 ? "" : "es"}` : "No matches"}</span>}
      <button type="button" onClick={() => setAll(true)} className={btn}>
        Expand All
      </button>
      <button type="button" onClick={() => setAll(false)} className={btn}>
        Collapse All
      </button>
    </div>
  );
}
