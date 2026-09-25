import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import StatusBadge from "@core/components/StatusBadge";
import { getDb } from "@/lib/db";
import { listStudents, studentName } from "@/lib/students";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const db = getDb();
  const students = listStudents(db, "all");

  const rows: TableRow[] = students.map((s) => ({
    key: s.id,
    href: `/students/${s.id}`,
    text: `${studentName(s)} ${s.email ?? ""} ${s.phone ?? ""}`,
    sort: { name: studentName(s), classes: s.classes_count, runs: s.runs_count, added: s.created_at },
    cells: {
      name: <span className="font-bold">{studentName(s)}</span>,
      contact: (
        <span className="text-neutral-400">
          {s.email ?? "—"}
          {s.phone ? <span className="block text-xs">{s.phone}</span> : null}
        </span>
      ),
      classes: s.classes_count,
      runs: s.runs_count,
      status: <StatusBadge status={s.status} />,
      added: fd(s.created_at.slice(0, 10)),
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${students.length} on the roster`}
        actions={
          <div className="flex gap-2">
            <a className="btn" href="/students/import">
              Import
            </a>
            <a className="btn btn-primary" href="/students/new">
              + Add Student
            </a>
          </div>
        }
      />

      {students.length === 0 ? (
        <EmptyState title="No students yet">
          Add students one at a time, or import a class list from a CSV or spreadsheet.
        </EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Student", sortable: true },
            { key: "contact", label: "Contact" },
            { key: "classes", label: "Classes", align: "right", sortable: true },
            { key: "runs", label: "Runs", align: "right", sortable: true },
            { key: "status", label: "Status" },
            { key: "added", label: "Added", align: "right", sortable: true },
          ]}
          rows={rows}
          initialSort={{ key: "name", dir: "asc" }}
          filterPlaceholder="Filter by name, email or phone…"
        />
      )}
    </div>
  );
}
