"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type Column = { key: string; label: string; align?: "left" | "right" | "center"; sortable?: boolean; className?: string };
export type TableRow = {
  key: string;
  href?: string;
  text?: string;
  sort?: Record<string, string | number | null | undefined>;
  cells: Record<string, ReactNode>;
};

function interactive(target: EventTarget | null) {
  return Boolean((target as HTMLElement | null)?.closest?.("a,button,input,select,textarea,label,form,summary"));
}

export default function DataTable({
  columns,
  rows,
  filterPlaceholder,
  emptyMessage = "Nothing here yet.",
  noMatchMessage = "No matches.",
  initialSort,
  footer,
  sticky = true,
}: {
  columns: Column[];
  rows: TableRow[];
  filterPlaceholder?: string;
  emptyMessage?: ReactNode;
  noMatchMessage?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  footer?: ReactNode;
  sticky?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);


  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle ? rows.filter((r) => (r.text ?? "").toLowerCase().includes(needle)) : rows;
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = a.sort?.[sort.key];
        const y = b.sort?.[sort.key];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" }) * dir;
      });
    }
    return list;
  }, [rows, q, sort]);

  const align = (c: Column) => (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "");

  return (
    <div className="flex flex-col gap-3">
      {filterPlaceholder && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={filterPlaceholder} aria-label={filterPlaceholder} className="input w-full" />
      )}
      <div className={`table-wrap ${sticky ? "table-sticky" : ""}`}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={`${align(c)} ${c.className ?? ""}`} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => setSort(active ? { key: c.key, dir: sort!.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" })}
                        className={`inline-flex items-center gap-1 uppercase hover:text-neutral-100 ${active ? "text-brand-amber" : ""}`}
                      >
                        {c.label}
                        <span aria-hidden className="text-[10px]">{active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.key}
                data-href={r.href}
                className={r.href ? "cursor-pointer" : undefined}
                onClick={
                  r.href
                    ? (e) => {
                        if (interactive(e.target) || window.getSelection()?.toString()) return;
                        router.push(r.href!);
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={`${align(c)} ${c.className ?? ""}`}>
                    {r.cells[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
        {shown.length === 0 && <div className="px-3 py-6 text-center text-sm text-neutral-500">{rows.length === 0 ? emptyMessage : noMatchMessage}</div>}
      </div>
    </div>
  );
}
