import Link from "next/link";
import type { Reminder } from "@/lib/reminders";
import { dismissReminders } from "@/app/reminder-actions";

export default function LaunchReminders({ items }: { items: Reminder[] }) {
  if (!items.length) return null;
  return (
    <div className="border-b border-neutral-700 bg-neutral-900 print:hidden" role="status">
      <form action={dismissReminders} className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3 px-4 py-2 text-sm sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs tracking-[0.2em] text-neutral-500">HEADS UP</span>
          {items.slice(0, 6).map((r) => (
            <Link key={r.key} href={r.href} className={`hover:underline ${r.tone === "red" ? "text-red-300" : "text-amber-300"}`}>
              {r.text}
            </Link>
          ))}
          {items.length > 6 && <span className="text-neutral-500">+{items.length - 6} more</span>}
        </div>
        <button type="submit" className="border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300 hover:text-neutral-100">
          Dismiss
        </button>
      </form>
    </div>
  );
}
