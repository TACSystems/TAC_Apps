import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { checklistItems, checklistNames, seedInstructorBag } from "@core/lib/checklist";
import Checklist from "@/components/Checklist";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ list?: string; new?: string }> }) {
  const { list: wanted, new: newName } = await searchParams;
  const db = getDb();
  seedInstructorBag(db);
  const names = checklistNames(db);
  const extra = newName && !names.includes(newName) ? [newName.slice(0, 60)] : [];
  const all = [...names, ...extra];
  const list = wanted && all.includes(wanted) ? wanted : extra[0] ?? all[0] ?? "Instructor Bag";
  const items = checklistItems(db, list);
  const sections = [...new Set(items.map((i) => i.section).filter((s): s is string => Boolean(s)))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={`${list} Checklist`}
          subtitle="Tick items off as you pack. Uncheck All resets it for the next class."
        />
        <div className="no-print flex flex-wrap items-center gap-2">
          {all.map((n) => (
            <Link
              key={n}
              href={`/checklist?list=${encodeURIComponent(n)}`}
              className={`border px-3 py-1.5 text-xs ${
                n === list
                  ? "border-[var(--tq-scarlet)] bg-neutral-800 text-neutral-100"
                  : "border-neutral-700 text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {n}
            </Link>
          ))}
          <form action="/checklist" className="flex gap-1">
            <input name="new" placeholder="New list (e.g. Rifle Class)" className="input input-sm text-xs" />
            <button type="submit" className="border border-neutral-700 px-2 py-1 text-xs">
              + List
            </button>
          </form>
        </div>
      </div>
      <Checklist key={list} list={list} items={items} sections={sections.length ? sections : ["General"]} />
    </div>
  );
}
