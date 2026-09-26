import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { allQualifications } from "@/lib/records";
import { classNumberLabel } from "@/lib/classes";
import { fd } from "@/lib/display";
import ResultBadge from "@/components/ResultBadge";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const db = getDb();
  const rows = allQualifications(db);

  const table: TableRow[] = rows.map((q) => ({
    key: `${q.student_id}:${q.cof_id}`,
    href: `/students/${q.student_id}`,
    text: `${q.last_name}, ${q.first_name} ${q.course_name} ${q.course_code} ${
      q.class_number != null ? `${classNumberLabel(q.class_number)} ${q.class_title ?? ""}` : ""
    }`,
    sort: {
      student: `${q.last_name}, ${q.first_name}`,
      // Sorting by class gives class first, then student within it.
      class: `${String(q.class_number ?? 0).padStart(6, "0")}|${q.last_name}, ${q.first_name}`,
      course: q.course_name,
      best: q.best_percent ?? -1,
      latest: q.latest_percent ?? -1,
      last: q.last_run_date ?? "",
    },
    cells: {
      student: <span className="font-bold">{`${q.last_name}, ${q.first_name}`}</span>,
      class:
        q.class_number != null ? (
          <span>
            {classNumberLabel(q.class_number)}
            <span className="block text-xs text-neutral-400">{q.class_title}</span>
          </span>
        ) : (
          <span className="text-neutral-500">—</span>
        ),
      course: (
        <span>
          {q.course_name}
          <span className="block text-xs text-neutral-400">{q.course_code}</span>
        </span>
      ),
      runs: `${q.passes}/${q.runs}`,
      best: q.best_percent != null ? `${q.best_percent.toFixed(1)}%` : "—",
      latest: q.latest_percent != null ? `${q.latest_percent.toFixed(1)}%` : "—",
      result: <ResultBadge passed={Boolean(q.latest_passed)} />,
      last: q.last_passed_date ? fd(q.last_passed_date) : "—",
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Qualification Records"
          subtitle={`${rows.length} student-course record${
          rows.length === 1 ? "" : "s"
        }. Sort by Latest class to group a class together.`}
        />
        <div className="no-print flex flex-wrap gap-2">
          {[
            ["qualifications", "Qualifications"],
            ["scored-runs", "Scored Runs"],
            ["students", "Students"],
          ].map(([type, label]) => (
            <a key={type} href={`/api/csv?type=${type}`} className="btn btn-secondary">
              {label} (.csv)
            </a>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing scored yet">
          Records build themselves from scored runs. Score a relay in a class and it shows up here.
        </EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "student", label: "Student", sortable: true },
            { key: "class", label: "Latest class", sortable: true },
            { key: "course", label: "Course", sortable: true },
            { key: "runs", label: "Passed / Runs", align: "right" },
            { key: "best", label: "Best", align: "right", sortable: true },
            { key: "latest", label: "Latest", align: "right", sortable: true },
            { key: "result", label: "Latest result" },
            { key: "last", label: "Last passed", align: "right", sortable: true },
          ]}
          rows={table}
          initialSort={{ key: "student", dir: "asc" }}
          filterPlaceholder="Filter these records by student, class or course…"
        />
      )}
    </div>
  );
}
