"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CategoryTags from "@core/components/CategoryTags";

export type CardLink = { label: string; href: string };

export type CourseCard = {
  id: string;
  name: string;
  code: string;
  meta: string;
  /** The card's own link. A function prop cannot cross a server/client
   *  boundary, so every href is data. */
  href: string;
  /** "3 runs logged" in TAC-LOG, "0 runs logged" in TAC-QUAL — the apps count
   *  different things, so each supplies its own line. */
  footer: string;
  categories: string[];
  /** Built by the app: the two score its courses from different places. */
  links: CardLink[];
};

export default function CourseList({
  courses,
  categories,
  searchPlaceholder = "Search courses by name, code, or category…",
  emptyText = "No courses of fire yet.",
}: {
  courses: CourseCard[];
  categories: string[];
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const extra = useMemo(() => {
    const seen = new Set(categories.map((c) => c.toLowerCase()));
    const out: string[] = [];
    for (const c of courses) for (const k of c.categories) if (!seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
    return out;
  }, [courses, categories]);
  const filters = [...categories, ...extra];
  const count = (f: string) =>
    f === "all" ? courses.length : f === "none" ? courses.filter((c) => !c.categories.length).length : courses.filter((c) => c.categories.some((k) => k.toLowerCase() === f.toLowerCase())).length;

  const shown = courses.filter((c) => {
    if (filter === "none" && c.categories.length) return false;
    if (filter !== "all" && filter !== "none" && !c.categories.some((k) => k.toLowerCase() === filter.toLowerCase())) return false;
    const needle = q.trim().toLowerCase();
    return !needle || `${c.name} ${c.code} ${c.categories.join(" ")}`.toLowerCase().includes(needle);
  });

  const chip = (key: string, label: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={filter === key}
      onClick={() => setFilter(key)}
      className={`border px-3 py-1.5 text-xs ${filter === key ? "border-brand-olive bg-brand-olive text-neutral-100" : "border-neutral-700 text-neutral-400 hover:text-neutral-100"}`}
    >
      {label} <span className="text-neutral-400">{count(key)}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by category">
        {chip("all", "All")}
        {filters.map((f) => chip(f, f))}
        {count("none") > 0 && chip("none", "Uncategorized")}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        className="input"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <div key={c.id} className="flex flex-col border border-neutral-800 bg-neutral-900 hover:border-neutral-600">
            <Link href={c.href} className="flex flex-1 flex-col gap-1 p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-neutral-400">{c.meta}</div>
              <CategoryTags categories={c.categories} />
              <div className="text-xs text-neutral-500">{c.footer}</div>
            </Link>
            <div className="flex flex-wrap gap-4 border-t border-neutral-800 px-4 py-2 text-xs">
              {c.links.map((l) => (
                <Link key={l.label} href={l.href} className="text-brand-amber hover:text-brand-amber-light">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-neutral-500">
            {courses.length ? "No courses match this filter." : emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
