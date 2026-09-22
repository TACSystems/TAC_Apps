import Link from "next/link";
import { getDb } from "@/lib/db";
import type { CourseOfFire } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const db = getDb();
  const courses = db.prepare(`select * from courses_of_fire order by name`).all() as CourseOfFire[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Courses of Fire</h1>
        <Link href="/courses/updates" className="text-sm text-blue-400 hover:text-blue-300">
          Import Updates
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.id}`}
            className="rounded border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-neutral-400">
              {c.code} · {c.total_rounds} rounds · {c.target_type}
            </div>
          </Link>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-neutral-500">No courses of fire loaded yet.</p>
        )}
      </div>
    </div>
  );
}
