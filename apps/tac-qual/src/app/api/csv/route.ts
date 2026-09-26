import { NextRequest, NextResponse } from "next/server";
import { lockedResponse } from "@/lib/api-guard";
import { getDb } from "@/lib/db";
import { toCsv } from "@core/lib/xlsx";
import { todayISO } from "@/lib/settings-shared";

export const dynamic = "force-dynamic";

const EXPORTS: Record<string, { headers: string[]; sql: string }> = {
  students: {
    headers: ["LAST NAME", "FIRST NAME", "EMAIL", "PHONE", "STATUS", "AGENCY", "BADGE ID", "RANK", "NOTES"],
    sql: `select last_name, first_name, email, phone, status, agency, badge_id, rank_title, notes
          from students order by last_name, first_name`,
  },
  qualifications: {
    headers: ["LAST NAME", "FIRST NAME", "COURSE CODE", "COURSE", "RUNS", "PASSES", "BEST %", "LATEST %", "LATEST RESULT", "LAST PASSED"],
    sql: `select s.last_name, s.first_name, c.code, c.name, q.runs, q.passes, q.best_percent, q.latest_percent,
            case when q.latest_passed = 1 then 'PASS' when q.latest_passed = 0 then 'FAIL' else null end,
            q.last_passed_date
          from student_qualifications q
          join students s on s.id = q.student_id
          join courses_of_fire c on c.id = q.cof_id
          order by s.last_name, s.first_name, c.name`,
  },
  "scored-runs": {
    headers: ["CLASS #", "CLASS", "DATE", "LAST NAME", "FIRST NAME", "COURSE CODE", "COURSE", "ATTEMPT", "KIND", "ROUNDS", "POINTS", "SCORE %", "PASSING %", "RESULT", "SCORED BY"],
    sql: `select cl.number, cl.title, r.date, s.last_name, s.first_name, c.code, c.name, r.attempt, r.kind,
            r.rounds_counted, r.total_points, r.final_score_percent, r.passing_score_percent,
            case when r.passed = 1 then 'PASS' else 'FAIL' end, r.scored_by
          from score_runs r
          join classes cl on cl.id = r.class_id
          join students s on s.id = r.student_id
          join courses_of_fire c on c.id = r.cof_id
          order by r.date desc, cl.number, s.last_name`,
  },
};

export async function GET(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const spec = EXPORTS[type];
  if (!spec) return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  const rows = getDb().prepare(spec.sql).raw().all() as (string | number | null)[][];
  return new NextResponse(toCsv(spec.headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="TAC-QUAL-${type}-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
