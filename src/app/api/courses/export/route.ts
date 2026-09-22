import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { exportCourse, loadCourse, type CofPatch } from "@/lib/cof";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const id = req.nextUrl.searchParams.get("id");
  const ids = id
    ? [id]
    : (db.prepare(`select id from courses_of_fire order by name`).all() as { id: string }[]).map((r) => r.id);

  const courses = ids.map((cid) => loadCourse(db, cid)).filter((c) => c !== null);
  if (courses.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const patch: CofPatch = { format: "tac-log-courses/2", courses: courses.map(exportCourse) };
  const stamp = new Date().toISOString().slice(0, 10);
  const base = id ? courses[0].code.replace(/[^a-zA-Z0-9.\-_]+/g, "_") : "all-courses";

  return new NextResponse(JSON.stringify(patch, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="TAC-LOG-${base}-${stamp}.json"`,
    },
  });
}
