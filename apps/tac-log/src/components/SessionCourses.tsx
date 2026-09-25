import { passFail } from "@core/lib/cof-shared";

export type CourseChip = { id: string; name: string; score: number | null; pass: number | null };

export function parseCourses(json: string | null): CourseChip[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as CourseChip[]) : [];
  } catch {
    return [];
  }
}

export default function SessionCourses({ courses }: { courses: CourseChip[] }) {
  if (!courses.length) return <span className="text-neutral-500">Practice</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {courses.map((c) => {
        const r = passFail(c.score, c.pass);
        return (
          <span key={c.id}>
            {c.name}
            {c.score != null ? ` ${c.score}%` : ""}
            {r && <span className={`ml-1 text-xs ${r === "PASS" ? "text-green-400" : "text-red-400"}`}>{r}</span>}
          </span>
        );
      })}
    </span>
  );
}
