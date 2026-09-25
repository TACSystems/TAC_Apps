import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { classNumberLabel, listClasses } from "@/lib/classes";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
};

export default async function ClassesPage() {
  const db = getDb();
  const classes = listClasses(db);

  const rows: TableRow[] = classes.map((c) => ({
    key: c.id,
    href: `/classes/${c.id}`,
    text: `${classNumberLabel(c.number)} ${c.title} ${c.location ?? ""}`,
    sort: { number: c.number, title: c.title, date: c.date, students: c.students, runs: c.runs },
    cells: {
      number: classNumberLabel(c.number),
      title: (
        <span>
          <span className="font-bold">{c.title}</span>
          {c.location ? <span className="block text-xs text-neutral-400">{c.location}</span> : null}
        </span>
      ),
      date: fd(c.date),
      students: c.students,
      courses: c.courses,
      runs: c.runs,
      status: <span className="text-xs tracking-widest text-neutral-400">{STATUS_LABEL[c.status]}</span>,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} class${classes.length === 1 ? "" : "es"}`}
        actions={
          <a className="btn btn-primary" href="/classes/new">
            + New Class
          </a>
        }
      />

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" actions={[{ href: "/classes/new", label: "Plan a class", primary: true }]}>
          A class holds the date, location, courses of fire, enrolled students and their relays.
        </EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "number", label: "#", sortable: true },
            { key: "title", label: "Class", sortable: true },
            { key: "date", label: "Date", sortable: true },
            { key: "students", label: "Students", align: "right", sortable: true },
            { key: "courses", label: "Courses", align: "right" },
            { key: "runs", label: "Runs", align: "right", sortable: true },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
          initialSort={{ key: "date", dir: "desc" }}
          filterPlaceholder="Filter by title, number or location…"
        />
      )}
    </div>
  );
}
