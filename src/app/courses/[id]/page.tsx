import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse } from "@/lib/cof";
import { CourseStrings } from "@/components/CourseSheet";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteCourse } from "../actions";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const runCount = (
    db.prepare(`select count(*) as n from range_log where cof_id = ?`).get(id) as { n: number }
  ).n;

  const btn = "border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/courses" className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← Courses of Fire
          </Link>
          <h1 className="text-xl font-semibold">{course.name}</h1>
          <p className="text-sm text-neutral-400">
            {course.code} · {course.effective_total_rounds} rounds
            {course.target ? (
              <>
                {" · target "}
                <Link href={`/targets/${course.target.id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {course.target.name}
                </Link>
              </>
            ) : (
              " · no target type set"
            )}
            {course.passing_score_percent != null ? ` · passing ${course.passing_score_percent}%` : ""}
          </p>
          {course.notes && <p className="mt-2 max-w-4xl text-sm whitespace-pre-line text-neutral-300">{course.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/courses/${id}/log`} className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Log a Range Session
          </Link>
          <Link href={`/courses/${id}/print`} className={btn}>
            Print
          </Link>
          <Link href={`/courses/${id}/edit`} className={btn}>
            Edit
          </Link>
          <Link href={`/courses/new?from=${id}`} className={btn}>
            Duplicate
          </Link>
          <a href={`/api/courses/export?id=${id}`} className={btn}>
            Export
          </a>
          <form action={deleteCourse.bind(null, id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete ${course.name}? ${
                runCount > 0
                  ? `Your ${runCount} logged range session${runCount === 1 ? "" : "s"} on this course stay on file but will no longer show a linked course.`
                  : "No range sessions have been logged on it."
              } This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <CourseStrings course={course} variant="screen" />

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Scoring Zones</h2>
        <div className="flex flex-wrap gap-3">
          {(course.target?.zones ?? []).map((z) => (
            <div key={z.zone_label} className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              {z.zone_label}: <span className="text-neutral-400">{z.value} pts</span>
            </div>
          ))}
          {!course.target && (
            <p className="text-sm text-neutral-500">
              Pick a target type in the editor to enable scoring for this course.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
