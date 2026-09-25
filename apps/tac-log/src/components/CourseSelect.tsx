"use client";

import { useRouter } from "next/navigation";
import type { CourseOfFire } from "@/lib/db/types";

export default function CourseSelect({
  courses,
  selectedId,
  basePath = "/stats",
}: {
  courses: CourseOfFire[];
  selectedId: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`${basePath}?cof=${e.target.value}`)}
      className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
    >
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
