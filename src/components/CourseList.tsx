"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CategoryTags from "@/components/CategoryTags";

export type CourseCard = {
  id: string;
  name: string;
  code: string;
  meta: string;
  runs: number;
  categories: string[];
};

export default function CourseList({ courses, categories }: { courses: CourseCard[]; categories: string[] }) {
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
        placeholder="Search courses by name, code, or category…"
        className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <div key={c.id} className="flex flex-col border border-neutral-800 bg-neutral-900 hover:border-neutral-600">
            <Link href={`/courses/${c.id}`} className="flex flex-1 flex-col gap-1 p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-neutral-400">{c.meta}</div>
              <CategoryTags categories={c.categories} />
              <div className="text-xs text-neutral-500">
                {c.runs} range session{c.runs === 1 ? "" : "s"} logged
              </div>
            </Link>
            <div className="flex gap-4 border-t border-neutral-800 px-4 py-2 text-xs">
              <Link href={`/courses/${c.id}/log`} className="text-brand-amber hover:text-brand-amber-light">
                Log a Range Session
              </Link>
              <Link href={`/courses/${c.id}/print`} className="text-brand-amber hover:text-brand-amber-light">
                Print
              </Link>
              <Link href={`/courses/${c.id}/edit`} className="text-brand-amber hover:text-brand-amber-light">
                Edit
              </Link>
              <Link href={`/courses/new?from=${c.id}`} className="text-brand-amber hover:text-brand-amber-light">
                Duplicate
              </Link>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-neutral-500">
            {courses.length ? "No courses match this filter." : "No courses of fire yet. Build one, or import course files in Settings."}
          </p>
        )}
      </div>
    </div>
  );
}
