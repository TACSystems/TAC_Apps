"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FileDrop from "@core/components/FileDrop";
import CategoryPicker from "@core/components/CategoryPicker";
import { commitCourseImport, previewCourseImport } from "@/app/courses/import-actions";
import { normalizeCategories, suggestCategories } from "@core/lib/course-categories";
import type { CofPatch } from "@core/lib/cof";
import Spinner from "@core/components/Spinner";

type Incoming = {
  key: string;
  file: string;
  course: CofPatch["courses"][number];
  categories: string[];
  fromFile: boolean;
  replaces: string | null;
};

function courseText(c: CofPatch["courses"][number]) {
  const parts: string[] = [c.name ?? "", c.notes ?? ""];
  for (const p of c.phases ?? []) {
    parts.push(p.title ?? "", p.notes ?? "");
    for (const s of p.strings ?? []) parts.push(...Object.values(s).map((v) => (typeof v === "string" ? v : "")));
  }
  return parts.join(" ");
}

export default function ImportCofForm() {
  const router = useRouter();
  const [items, setItems] = useState<Incoming[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function read(files: File[]) {
    setStatus(null);
    setReading(true);
    const found: { file: string; course: CofPatch["courses"][number] }[] = [];
    const errs: string[] = [];
    for (const f of files) {
      try {
        const data = JSON.parse(await f.text()) as CofPatch;
        const courses = Array.isArray(data?.courses) ? data.courses.filter((c) => c && c.code && c.name) : [];
        if (!courses.length) errs.push(`${f.name}: no courses found in this file.`);
        for (const c of courses) found.push({ file: f.name, course: c });
      } catch {
        errs.push(`${f.name}: not a valid course file (.json).`);
      }
    }
    const merged = new Map<string, { file: string; course: CofPatch["courses"][number] }>();
    for (const item of [...items.map((i) => ({ file: i.file, course: i.course })), ...found]) {
      if (merged.has(item.course.code)) errs.push(`${item.course.code} appears more than once; the copy from ${item.file} is used.`);
      merged.set(item.course.code, item);
    }
    const preview = await previewCourseImport([...merged.keys()]);
    setOptions(preview.options);
    const kept = new Map(items.map((i) => [i.course.code, i.categories]));
    setItems(
      [...merged.values()].map(({ file, course }) => {
        const fileCats = normalizeCategories(course.categories).map(
          (c) => preview.options.find((o) => o.toLowerCase() === c.toLowerCase()) ?? c
        );
        const categories = kept.get(course.code) ?? (fileCats.length ? fileCats : suggestCategories(courseText(course), preview.options));
        return {
          key: course.code,
          file,
          course,
          categories,
          fromFile: fileCats.length > 0,
          replaces: preview.existing[course.code] ?? null,
        };
      })
    );
    setProblems(errs);
    setReading(false);
  }

  const ready = items.length > 0 && items.every((i) => i.categories.length > 0);
  const missing = items.filter((i) => !i.categories.length).length;

  return (
    <div className="flex flex-col gap-3">
      <FileDrop
        multiple
        accept="application/json,.json"
        label="Select Course Files"
        prompt="Drag one or more course files (.json) here, or"
        busyText={reading ? "Reading…" : null}
        showSelected={false}
        onFiles={read}
      />
      {problems.map((p, i) => (
        <p key={i} className="text-xs text-amber-300">
          {p}
        </p>
      ))}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400">
            Review {items.length} course{items.length === 1 ? "" : "s"}. Every course needs at least one category before
            importing.
          </div>
          <div className="border border-neutral-800">
            {items.map((it, idx) => (
              <div key={it.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm">
                    {it.course.name} <span className="text-neutral-500">· {it.course.code}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {it.file}
                    {it.replaces ? (
                      <span className="ml-2 text-amber-300">Updates existing &ldquo;{it.replaces}&rdquo;</span>
                    ) : (
                      <span className="ml-2 text-green-400">New</span>
                    )}
                    {!it.fromFile && it.categories.length > 0 && " · categories suggested from the course"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryPicker
                    compact
                    options={options}
                    value={it.categories}
                    onChange={(v) => setItems(items.map((x, k) => (k === idx ? { ...x, categories: v } : x)))}
                  />
                  <button
                    type="button"
                    title="Leave this course out"
                    onClick={() => setItems(items.filter((_, k) => k !== idx))}
                    className="btn btn-secondary btn-xs hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!ready || pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await commitCourseImport(items.map((i) => ({ ...i.course, categories: i.categories })));
                  if (res.ok) {
                    setStatus({ ok: true, text: `Imported ${res.count} course${res.count === 1 ? "" : "s"}.` });
                    setItems([]);
                    setProblems([]);
                    router.refresh();
                  } else {
                    setStatus({ ok: false, text: res.error ?? "Import failed." });
                  }
                })
              }
              className="btn btn-primary"
            >
              {pending ? (
                <>
                  <Spinner /> Importing…
                </>
              ) : (
                `Import ${items.length} Course${items.length === 1 ? "" : "s"}`
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setItems([]);
                setProblems([]);
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
            {missing > 0 && <span className="text-xs text-amber-300">{missing} still need a category.</span>}
          </div>
        </div>
      )}
      {status && <p className={`text-sm ${status.ok ? "text-green-400" : "text-red-400"}`}>{status.text}</p>}
    </div>
  );
}
