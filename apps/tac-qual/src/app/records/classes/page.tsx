import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { classArchive } from "@/lib/records";
import { classNumberLabel } from "@/lib/classes";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function ClassArchivePage() {
  const db = getDb();
  const rows = classArchive(db);

  const table: TableRow[] = rows.map((c) => {
    const rate = c.runs > 0 ? Math.round((c.passes / c.runs) * 1000) / 10 : null;
    return {
      key: c.id,
      href: `/classes/${c.id}`,
      text: `${classNumberLabel(c.number)} ${c.title} ${c.location ?? ""}`,
      sort: {
        number: c.number,
        date: c.date,
        title: c.title,
        enrolled: c.enrolled,
        rate: rate ?? -1,
      },
      cells: {
        number: <span className="text-neutral-400">{classNumberLabel(c.number)}</span>,
        title: (
          <span>
            <span className="font-bold">{c.title}</span>
            {c.location && <span className="block text-xs text-neutral-400">{c.location}</span>}
          </span>
        ),
        date: fd(c.date),
        enrolled: c.enrolled,
        scored: `${c.scored}/${c.enrolled}`,
        rate:
          rate == null ? (
            <span className="text-neutral-500">—</span>
          ) : (
            <span>
              {rate.toFixed(1)}%
              <span className="block text-xs text-neutral-500">
                {c.passes}/{c.runs} runs
              </span>
            </span>
          ),
      },
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Archive"
        subtitle={`${rows.length} class${rows.length === 1 ? "" : "es"}, newest first. Pass rate counts every scored run, including remedials.`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No classes yet">Create a class and it appears here once it has been scored.</EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "number", label: "Class", sortable: true },
            { key: "title", label: "Title", sortable: true },
            { key: "date", label: "Date", align: "right", sortable: true },
            { key: "enrolled", label: "Enrolled", align: "right", sortable: true },
            { key: "scored", label: "Scored", align: "right" },
            { key: "rate", label: "Pass rate", align: "right", sortable: true },
          ]}
          rows={table}
          initialSort={{ key: "date", dir: "desc" }}
          filterPlaceholder="Filter by title or location…"
        />
      )}
    </div>
  );
}
