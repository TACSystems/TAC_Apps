import Icon from "@core/components/Icon";
import PageHeader from "@core/components/PageHeader";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { daysUntil, docState, listDocuments } from "@/lib/documents";
import { fd } from "@/lib/display";
import DocStateBadge from "@/components/DocStateBadge";
import DataTable from "@core/components/DataTable";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  const db = getDb();
  const s = getSettings(db);
  const docs = listDocuments(db);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Permits & Documents"
        icon="documents"
        subtitle={`Carry permits, NFA stamps, memberships, and licenses. TAC-LOG warns you ${s.docWarnDays} days before anything expires.`}
        actions={
          <Link href="/documents/new" className="btn btn-primary">
            <Icon name="plus" /> Add Document
          </Link>
        }
      />
      {docs.length === 0 ? (
        <div className="border border-dashed border-neutral-700 p-6 text-sm text-neutral-400">
          Nothing tracked yet. Add your carry permit, NFA tax stamps, range membership, or hunting license to get a warning
          before each one expires, and keep a scan of it with the record.
          <div className="mt-3">
            <Link href="/documents/new" className="btn btn-primary text-neutral-100">
              + Add Document
            </Link>
          </div>
        </div>
      ) : (
        <DataTable
          filterPlaceholder="Filter documents…"
          initialSort={{ key: "expires", dir: "asc" }}
          columns={[
            { key: "title", label: "Document", sortable: true },
            { key: "type", label: "Type", sortable: true },
            { key: "issuer", label: "Issued by", sortable: true },
            { key: "status", label: "Status", sortable: true },
            { key: "expires", label: "Expires", sortable: true },
            { key: "state", label: "" },
          ]}
          rows={docs.map((d) => ({
            key: d.id,
            href: `/documents/${d.id}`,
            text: `${d.title} ${d.doc_type} ${d.issuer ?? ""} ${d.number ?? ""} ${d.status ?? ""} ${d.firearm_label ?? ""}`,
            sort: { title: d.title, type: d.doc_type, issuer: d.issuer, status: d.status, expires: d.expires_date },
            cells: {
              title: (
                <>
                  <Link href={`/documents/${d.id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {d.title}
                  </Link>
                  {d.firearm_label && <div className="text-xs text-neutral-500">{d.firearm_label}</div>}
                </>
              ),
              type: d.doc_type,
              issuer: <span className="text-neutral-400">{d.issuer ?? "—"}</span>,
              status: d.status ?? "—",
              expires: fd(d.expires_date) || "—",
              state: <DocStateBadge state={docState(d, s.docWarnDays, s.docUrgentDays)} days={daysUntil(d.expires_date)} />,
            },
          }))}
        />
      )}
    </div>
  );
}
