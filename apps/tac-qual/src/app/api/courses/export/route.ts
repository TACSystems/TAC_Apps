import { getDb } from "@/lib/db";
import { exportCourse, loadCourse } from "@core/lib/cof";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const ids = (db.prepare(`select id from courses_of_fire order by name`).all() as { id: string }[]).map((r) => r.id);
  const courses = ids.map((id) => loadCourse(db, id)).filter((c) => c !== null).map((c) => exportCourse(c!));
  const body = JSON.stringify({ format: "tac-log-courses/3", courses }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="tac-qual-courses.json"`,
    },
  });
}
