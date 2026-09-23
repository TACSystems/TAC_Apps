import Link from "next/link";
import { getDb } from "@/lib/db";
import { listTargetTypes } from "@/lib/cof";

export const dynamic = "force-dynamic";

export default async function TargetTypesPage() {
  const targets = listTargetTypes(getDb());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/courses" className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← Courses of Fire
          </Link>
          <h1 className="text-xl font-semibold">Target Types</h1>
          <p className="text-sm text-neutral-400">
            Each target type carries its own scoring matrix and can be reused by any course of fire.
          </p>
        </div>
        <Link href="/targets/new" className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">
          New Target Type
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {targets.map((t) => (
          <Link
            key={t.id}
            href={`/targets/${t.id}`}
            className="border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-neutral-500">
              Used by {t.course_count} course{t.course_count === 1 ? "" : "s"}
              {t.description ? ` · ${t.description}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-300">
              {t.zones.map((z) => (
                <span key={z.zone_label} className="border border-neutral-700 px-2 py-0.5">
                  {z.zone_label}: {z.value}
                </span>
              ))}
            </div>
          </Link>
        ))}
        {targets.length === 0 && <p className="text-sm text-neutral-500">No target types yet.</p>}
      </div>
    </div>
  );
}
