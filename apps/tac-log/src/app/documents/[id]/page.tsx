import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import DocumentForm from "@/components/DocumentForm";
import DocStateBadge from "@/components/DocStateBadge";
import AttachmentGallery from "@/components/AttachmentGallery";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { listAttachments } from "@/lib/attachments";
import { daysUntil, docState, type DocRow } from "@/lib/documents";
import { deleteDocument, updateDocument } from "../actions";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import { pageSections } from "@core/lib/page-sections";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const db = getDb();
  const doc = db.prepare(`select * from documents where id = ?`).get(id) as DocRow | undefined;
  if (!doc) notFound();
  const s = getSettings(db);
  const firearms = db
    .prepare(`select id, firearm_label(make_model, nickname) as label from firearms order by make_model`)
    .all() as { id: string; label: string }[];
  const open = pageSections(db, "document");
  const scans = listAttachments(db, "document", id);
  return (
    <div data-scope="document" className="flex max-w-4xl flex-col gap-4">
      <div>
        <Link href="/documents" className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Permits &amp; Documents
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{doc.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              {doc.doc_type}
              <DocStateBadge state={docState(doc, s.docWarnDays, s.docUrgentDays)} days={daysUntil(doc.expires_date)} />
            </div>
          </div>
          <form action={deleteDocument.bind(null, id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${doc.title}" and its attached files? This cannot be undone.`}
              className="btn btn-danger"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
        {saved && <p className="mt-2 text-sm text-green-400">Saved.</p>}
      </div>
      <SectionTools scope="document" remember />
      <Collapsible
        id="details"
        scope="document"
        title="Details"
        defaultOpen={open("details", true)}
        summary={[doc.issuer, doc.number, doc.expires_date ? `expires ${fd(doc.expires_date)}` : null].filter(Boolean).join(" · ")}
      >
        <DocumentForm doc={doc} firearms={firearms} action={updateDocument.bind(null, id)} submitLabel="Save Changes" />
      </Collapsible>
      <Collapsible id="scans" scope="document" title="Scans & Photos" defaultOpen={open("scans", true)} summary={`${scans.length} file${scans.length === 1 ? "" : "s"}`}>
      <AttachmentGallery
        items={scans}
        ownerType="document"
        ownerId={id}
        kind="document"
        emptyText="No scans attached yet. Photograph both sides of a permit card, or attach the PDF."
      />
      </Collapsible>
    </div>
  );
}
