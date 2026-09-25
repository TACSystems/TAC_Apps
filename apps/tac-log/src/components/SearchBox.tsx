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
        className="w-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case"
      />
      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">{head}</thead>
          <tbody>{filtered.map((r) => r.row)}</tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-neutral-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
