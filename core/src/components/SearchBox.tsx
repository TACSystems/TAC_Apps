"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export type SearchRow = {
  key: string;
  text: string;
  row: ReactNode;
};

export default function SearchBox({
  placeholder = "Search…",
  head,
  rows,
  emptyMessage = "No results found.",
}: {
  placeholder?: string;
  head: ReactNode;
  rows: SearchRow[];
  emptyMessage?: string;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((r) => r.text.toLowerCase().includes(needle)) : rows;

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
      />
      <div className="table-wrap table-sticky">
        <table className="table">
          <thead>{head}</thead>
          <tbody>{filtered.map((r) => r.row)}</tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-neutral-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
