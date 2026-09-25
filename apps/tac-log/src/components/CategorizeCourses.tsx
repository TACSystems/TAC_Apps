"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import CategoryPicker from "@core/components/CategoryPicker";
import { saveCategorized } from "@/app/courses/categorize/actions";

type Row = { id: string; code: string; name: string; suggested: string[] };

export default function CategorizeCourses({ rows, options }: { rows: Row[]; options: string[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string[]>>(() => Object.fromEntries(rows.map((r) => [r.id, r.suggested])));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const done = rows.filter((r) => values[r.id]?.length).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-neutral-800">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 last:border-b-0">
            <div>
              <Link href={`/courses/${r.id}`} className="text-brand-amber hover:text-brand-amber-light" target="_blank">
                {r.name}
              </Link>
              <div className="text-xs text-neutral-500">
                {r.code}
                {r.suggested.length > 0 && " · pre-ticked from the course content, change if needed"}
              </div>
            </div>
            <CategoryPicker options={options} value={values[r.id] ?? []} onChange={(v) => setValues({ ...values, [r.id]: v })} compact />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || done === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await saveCategorized(rows.map((r) => ({ id: r.id, categories: values[r.id] ?? [] })));
              setMsg(`Saved categories for ${res.saved} course${res.saved === 1 ? "" : "s"}.`);
              router.push("/courses");
            })
          }
          className="btn btn-primary"
        >
          {pending ? "Saving…" : `Save ${done} of ${rows.length}`}
        </button>
        {done < rows.length && <span className="text-xs text-neutral-500">Courses left blank stay under Uncategorized.</span>}
        {msg && <span className="text-sm text-green-400">{msg}</span>}
      </div>
    </div>
  );
}
