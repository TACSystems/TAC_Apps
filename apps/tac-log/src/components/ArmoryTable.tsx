"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StatusBadge from "@core/components/StatusBadge";
import EmptyState from "@core/components/EmptyState";
import ClickRow from "@core/components/ClickRow";

export type ArmoryRow = {
  id: string;
  label: string;
  makeModel: string;
  nickname: string | null;
  caliber: string | null;
  platform: string | null;
  serial: string | null;
  status: string;
  shots: number;
  purchaseDate: string | null;
  purchaseDateText: string;
};

type SortKey = "label" | "caliber" | "platform" | "serial" | "status" | "shots" | "purchaseDate";
type Filter = "all" | "active" | "stored" | "sold";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["stored", "Stored"],
  ["sold", "Sold"],
];
const COLUMNS: [SortKey, string][] = [
  ["label", "Firearm"],
  ["caliber", "Caliber"],
  ["platform", "Platform"],
  ["serial", "Serial"],
  ["status", "Status"],
  ["shots", "Rounds Fired"],
];

function groupCounts(rows: ArmoryRow[], key: "platform" | "caliber") {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r[key]?.trim() || "Unspecified";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function ArmoryTable({ rows }: { rows: ArmoryRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "label", dir: 1 });
  const [showTotals, setShowTotals] = useState(false);
  const byStatus = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? byStatus.filter((r) =>
          [r.makeModel, r.nickname, r.caliber, r.platform, r.serial, r.purchaseDateText]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : byStatus;
    const val = (r: ArmoryRow) => (sort.key === "shots" ? r.shots : (r[sort.key] ?? "") as string);
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
      const xs = String(x);
      const ys = String(y);
      if (!xs && ys) return 1;
      if (xs && !ys) return -1;
      return xs.localeCompare(ys, undefined, { numeric: true, sensitivity: "base" }) * sort.dir;
    });
  }, [byStatus, q, sort]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: rows.length };
    for (const r of rows) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  }, [rows]);

  function sortButton(key: SortKey, text: string) {
    const on = sort.key === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setSort(on ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: key === "shots" || key === "purchaseDate" ? -1 : 1 })}
        className={`uppercase tracking-[0.06em] hover:text-neutral-100 ${on ? "text-brand-amber" : ""}`}
        title={`Sort by ${text.toLowerCase()}`}
      >
        {text}
        <span className="ml-1 inline-block w-3">{on ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
      </button>
    );
  }

  function header(key: SortKey, text: string) {
    return (
      <th key={key} className="px-3 py-2">
        {sortButton(key, text)}
        {key === "label" && (
          <>
            <span className="mx-1 text-neutral-600">·</span>
            {sortButton("purchaseDate", "Purchased")}
          </>
        )}
      </th>
    );
  }

  const noun = byStatus.length === 1 ? "firearm" : "firearms";
  const label = filter === "all" ? noun : `${filter} ${noun}`;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Your armory is empty"
        actions={[
          { href: "/inventory/new", label: "+ Add Firearm", primary: true },
          { href: "/settings#settings-import-export", label: "Import Spreadsheet" },
        ]}
      >
        Add each firearm with its serial number, purchase details, and photos, or bring in your existing FIREARMS
        INVENTORY spreadsheet in one step.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowTotals(!showTotals)}
          aria-expanded={showTotals}
          className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-500"
        >
          <span className="text-lg text-brand-amber">{byStatus.length}</span> {label}
          <span className="ml-2 text-neutral-500">{showTotals ? "▴" : "▾"}</span>
        </button>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`border px-3 py-1.5 text-xs ${
                filter === key
                  ? "border-brand-olive bg-brand-olive text-neutral-100"
                  : "border-neutral-700 text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {text} <span className="text-neutral-400">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {showTotals && (
        <div className="grid grid-cols-1 gap-3 border border-neutral-800 bg-neutral-900 p-3 sm:grid-cols-2">
          {(["platform", "caliber"] as const).map((k) => (
            <div key={k}>
              <h3 className="mb-1 text-xs text-neutral-400">By {k === "platform" ? "Platform" : "Caliber"}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {groupCounts(byStatus, k).map(([name, n]) => (
                    <tr key={name} className="border-t border-neutral-800">
                      <td className="py-1 pr-3">{name}</td>
                      <td className="py-1 text-right text-brand-amber">{n}</td>
                    </tr>
                  ))}
                  {byStatus.length === 0 && (
                    <tr>
                      <td className="py-1 text-neutral-500">None</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by make/model, nickname, caliber, platform, or serial…"
        className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs text-neutral-400">
            <tr>
              {COLUMNS.map(([k, t]) => header(k, t))}
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <ClickRow key={f.id} href={`/inventory/${f.id}`} className="border-t border-neutral-800 align-top hover:bg-neutral-900">
                <td className="px-3 py-2">
                  <Link href={`/inventory/${f.id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {f.label}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {f.purchaseDateText ? `Purchased ${f.purchaseDateText}` : "Purchase date not set"}
                  </div>
                </td>
                <td className="px-3 py-2">{f.caliber}</td>
                <td className="px-3 py-2">{f.platform}</td>
                <td className="px-3 py-2 text-neutral-400">{f.serial}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={f.status} />
                </td>
                <td className="px-3 py-2">{f.shots.toLocaleString()}</td>
              </ClickRow>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No firearms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
