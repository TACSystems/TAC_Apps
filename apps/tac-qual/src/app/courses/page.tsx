import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `select c.id, c.code, c.name, c.total_rounds, c.passing_score_percent, c.categories_json,
              t.name as target_name,
              (select count(*) from score_runs r where r.cof_id = c.id) as runs
         from courses_of_fire c
         left join target_types t on t.id = c.target_type_id
        order by c.name`
    )
    .all() as {
    id: string;
    code: string;
    name: string;
    total_rounds: number | null;
    passing_score_percent: number | null;
    categories_json: string | null;
    target_name: string | null;
    runs: number;
  }[];

  const rows: TableRow[] = courses.map((c) => ({
    key: c.id,
    href: `/courses/${c.id}`,
    text: `${c.name} ${c.code} ${c.target_name ?? ""}`,
    sort: { name: c.name, code: c.code, rounds: c.total_rounds ?? 0, runs: c.runs },
    cells: {
      name: <span className="font-bold">{c.name}</span>,
      code: c.code,
      target: c.target_name ?? <span className="text-red-400">No target type</span>,
      rounds: c.total_rounds ?? "—",
      passing: c.passing_score_percent != null ? `${c.passing_score_percent}%` : "—",
      runs: c.runs,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses of Fire"
        subtitle={`${courses.length} course${courses.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex gap-2">
            <Link className="btn" href="/courses/import">
              Import
            </Link>
            <Link className="btn btn-primary" href="/courses/new">
              + New Course
            </Link>
            <a className="btn" href="/api/courses/export">
              Export All
            </a>
          </div>
        }
      />

      {courses.length === 0 ? (
        <EmptyState title="No courses of fire" actions={[{ href: "/courses/import", label: "Import courses", primary: true }]}>
          TAC-QUAL scores the courses you import. Export them from TAC-LOG and bring the file over here.
        </EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Course", sortable: true },
            { key: "code", label: "Code", sortable: true },
            { key: "target", label: "Target type" },
            { key: "rounds", label: "Rounds", align: "right", sortable: true },
            { key: "passing", label: "To pass", align: "right" },
            { key: "runs", label: "Runs", align: "right", sortable: true },
          ]}
          rows={rows}
          initialSort={{ key: "name", dir: "asc" }}
          filterPlaceholder="Filter courses…"
        />
      )}
    </div>
  );
}
