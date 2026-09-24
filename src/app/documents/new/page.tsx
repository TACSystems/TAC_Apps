import Link from "next/link";
import { getDb } from "@/lib/db";
import DocumentForm from "@/components/DocumentForm";
import { createDocument } from "../actions";

export const dynamic = "force-dynamic";

export default function NewDocumentPage() {
  const db = getDb();
  const firearms = db
    .prepare(`select id, firearm_label(make_model, nickname) as label from firearms order by make_model`)
    .all() as { id: string; label: string }[];
  return (
    <div className="max-w-4xl">
      <Link href="/documents" className="text-xs text-brand-amber hover:text-brand-amber-light">
        ← Permits &amp; Documents
      </Link>
      <h1 className="mb-4 text-xl font-semibold">Add Document</h1>
      <DocumentForm firearms={firearms} action={createDocument} submitLabel="Save Document" />
      <p className="mt-3 text-xs text-neutral-500">You can attach a scan or photo after saving.</p>
    </div>
  );
}
