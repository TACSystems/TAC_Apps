import Link from "next/link";
import { dismissCategorize } from "@/app/courses/categorize/actions";

export default function CategorizeBanner({ count }: { count: number }) {
  if (!count) return null;
  return (
    <form
      action={dismissCategorize}
      className="flex flex-wrap items-center justify-between gap-3 border border-brand-amber bg-brand-tile px-4 py-3 text-sm"
    >
      <span>
        Courses of Fire now have categories. {count} course{count === 1 ? " needs" : "s need"} one.
      </span>
      <span className="flex gap-2">
        <Link href="/courses/categorize" className="bg-brand-olive px-3 py-1.5 text-xs hover:bg-brand-olive-light">
          Categorize Now
        </Link>
        <button type="submit" className="border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-100">
          Later
        </button>
      </span>
    </form>
  );
}
