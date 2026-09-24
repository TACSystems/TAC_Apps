import Link from "next/link";
import { getDb } from "@/lib/db";
import { courseCategoryOptions, suggestionsForUncategorized } from "@/lib/course-category-store";
import CategorizeCourses from "@/components/CategorizeCourses";

export const dynamic = "force-dynamic";

export default function CategorizePage() {
  const db = getDb();
  const rows = suggestionsForUncategorized(db);
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div>
        <Link href="/courses" className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Courses of Fire
        </Link>
        <h1 className="text-xl">Categorize Courses</h1>
        <p className="text-sm text-neutral-400">
          Tick every type each course uses. You can add your own categories (Carbine, PCC, and so on) in Controls.
        </p>
      </div>
      {rows.length ? (
        <CategorizeCourses rows={rows} options={courseCategoryOptions(db)} />
      ) : (
        <p className="text-sm text-neutral-400">Every course has a category. Nothing to do here.</p>
      )}
    </div>
  );
}
