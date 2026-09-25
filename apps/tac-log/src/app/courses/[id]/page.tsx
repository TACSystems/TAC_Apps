import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse } from "@core/lib/cof";
import { CourseStrings } from "@core/components/CourseSheet";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { deleteCourse } from "../actions";
import CategoryTags from "@core/components/CategoryTags";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import { pageSections } from "@core/lib/page-sections";
import { fd } from "@/lib/display";
import { passFail } from "@core/lib/cof-shared";
import { sessionNo } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const course = loadCourse(db, id);
  if (!course) notFound();

  const runCount = (
    db.prepare(`select count(*) as n from range_log where cof_id = ?`).get(id) as { n: number }
  ).n;

  const runs = db
    .prepare(
      `select r.id, r.date, r.final_score_percent, r.passing_score_percent, firearm_label(f.make_model, f.nickname) as firearm, s.number
       from range_log r left join firearms f on f.id = r.firearm_id left join range_sessions s on s.id = r.session_id
       where r.cof_id = ? order by r.date desc, r.created_at desc limit 50`
    )
    .all(id) as { id: string; date: string; final_score_percent: number | null; passing_score_percent: number | null; firearm: string | null; number: number | null }[];
  const scored = runs.filter((r) => r.final_score_percent != null);
  const best = scored.length ? Math.max(...scored.map((r) => r.final_score_percent as number)) : null;
  const open = pageSections(db, "course");
  const phaseCount = course.phases.length;

  const btn = "border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800";

  return (
    <div data-scope="course" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/courses" className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← Courses of Fire
          </Link>
          <h1 className="text-xl font-semibold">{course.name}</h1>
          <div className="my-1">
            <CategoryTags categories={course.categories} />
          </div>
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
            Score This Course
          </Link>
          <Link href={`/timer?course=${id}`} className={btn}>
            Run with Par Timer
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
                  ? `Your ${runCount} logged run${runCount === 1 ? "" : "s"} of this course stay on file but will no longer show a linked course.`
                  : "No runs have been logged on it."
              } This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <SectionTools scope="course" remember />

      <Collapsible
        id="strings"
        scope="course"
        title="Course of Fire"
        defaultOpen={open("strings", true)}
        summary={`${phaseCount} phase${phaseCount === 1 ? "" : "s"} · ${course.effective_total_rounds} rounds`}
      >
        <CourseStrings course={course} variant="screen" />
      </Collapsible>

      <Collapsible
        id="zones"
        scope="course"
        title="Scoring Zones"
        defaultOpen={open("zones", false)}
        summary={course.target ? `${course.target.name} · ${course.target.zones.map((z) => `${z.zone_label} ${z.value}`).join(" · ")}` : "No target type"}
      >
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
      </Collapsible>

      <Collapsible
        id="runs"
        scope="course"
        title="Your Runs"
        defaultOpen={open("runs", false)}
        summary={runs.length ? `${runCount} run${runCount === 1 ? "" : "s"}${best != null ? ` · best ${best}%` : ""} · last ${fd(runs[0].date)}` : "Not shot yet"}
      >
        <div className="flex flex-col gap-1">
          {runs.map((r) => {
            const res = passFail(r.final_score_percent, r.passing_score_percent);
            return (
              <Link key={r.id} href={`/range-log/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm hover:border-neutral-600">
                <span>
                  {fd(r.date)}
                  {r.number != null && <span className="text-neutral-500"> · {sessionNo(r.number)}</span>} · {r.firearm ?? "No firearm"}
                </span>
                <span>
                  {r.final_score_percent != null ? `${r.final_score_percent}%` : "—"}
                  {res && <span className={`ml-1 text-xs ${res === "PASS" ? "text-green-400" : "text-red-400"}`}>{res}</span>}
                </span>
              </Link>
            );
          })}
          {runs.length === 0 && <p className="text-sm text-neutral-500">No runs of this course yet.</p>}
          {runCount > runs.length && <p className="text-xs text-neutral-500">Showing the latest {runs.length} of {runCount}.</p>}
        </div>
      </Collapsible>
    </div>
  );
}
