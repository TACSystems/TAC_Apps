"use client";

import { useEffect, useState } from "react";

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
    const openHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, []);

  function setAll(open: boolean) {
    const list = sections(scope);
    for (const d of list) {
      d.dataset.bulk = "1";
      d.open = open;
      d.style.display = "";
      setTimeout(() => delete d.dataset.bulk, 0);
    }
    if (persist || remember) {
      window.dispatchEvent(
        new CustomEvent("taclog:section", { detail: { scope: persist ? "dashboard" : scope, ids: list.map((d) => d.dataset.section ?? ""), open, all: true } })
      );
    }
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

  const btn = "btn btn-secondary btn-sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <input
          value={q}
          onChange={(e) => filter(e.target.value)}
          placeholder={placeholder}
          className="input min-w-[16rem] flex-1"
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
