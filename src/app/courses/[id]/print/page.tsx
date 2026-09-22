import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadCourse } from "@/lib/cof";
import PrintButton from "@/components/PrintButton";
import { CourseStrings, PrintFooter, PrintHeader, PrintScorecard } from "@/components/CourseSheet";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "all", label: "Course + Scorecard" },
  { key: "course", label: "Course Only" },
  { key: "card", label: "Scorecard Only" },
] as const;

export default async function CoursePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view: rawView } = await searchParams;
  const view = VIEWS.some((v) => v.key === rawView) ? rawView : "all";
  const course = loadCourse(getDb(), id);
  if (!course) notFound();

  return (
    <div className="print-sheet mx-auto max-w-3xl bg-white p-8 text-black">
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <PrintButton label="Print / Save as PDF" />
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/courses/${id}/print?view=${v.key}`}
            className={`border px-3 py-2 text-sm ${
              view === v.key ? "border-black bg-black text-white" : "border-neutral-400 hover:bg-neutral-100"
            }`}
          >
            {v.label}
          </Link>
        ))}
        <Link href={`/courses/${id}`} className="ml-auto text-sm underline">
          Back to course
        </Link>
      </div>

      <PrintHeader course={course} />

      {view !== "card" && <CourseStrings course={course} variant="print" />}

      {view !== "course" && (
        <div className={view === "all" ? "page-break mt-8" : ""}>
          {view === "all" && <PrintHeader course={course} />}
          <PrintScorecard course={course} />
        </div>
      )}

      <PrintFooter />
    </div>
  );
}
