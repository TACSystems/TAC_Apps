import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { daysUntil, docState, listDocuments } from "@/lib/documents";
import { fd } from "@/lib/display";
import DocStateBadge from "@/components/DocStateBadge";
import ClickRow from "@core/components/ClickRow";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  const db = getDb();
  const s = getSettings(db);
  const docs = listDocuments(db);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Permits &amp; Documents</h1>
          <p className="text-sm text-neutral-400">
            Carry permits, NFA stamps, memberships, and licenses. TAC-LOG warns you {s.docWarnDays} days before anything expires.
          </p>
        </div>
        <Link href="/documents/new" className="bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light">
          + Add Document
        </Link>
      </div>
      {docs.length === 0 ? (
        <div className="border border-dashed border-neutral-700 p-6 text-sm text-neutral-400">
          Nothing tracked yet. Add your carry permit, NFA tax stamps, range membership, or hunting license to get a warning
          before each one expires, and keep a scan of it with the record.
          <div className="mt-3">
            <Link href="/documents/new" className="bg-brand-olive px-3 py-2 text-sm text-neutral-100 hover:bg-brand-olive-light">
              + Add Document
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-xs text-neutral-400">
              <tr>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Issued by</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <ClickRow key={d.id} href={`/documents/${d.id}`} className="border-t border-neutral-800 hover:bg-neutral-900">
                  <td className="px-3 py-2">
                    <Link href={`/documents/${d.id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {d.title}
                    </Link>
                    {d.firearm_label && <div className="text-xs text-neutral-500">{d.firearm_label}</div>}
                  </td>
                  <td className="px-3 py-2">{d.doc_type}</td>
                  <td className="px-3 py-2 text-neutral-400">{d.issuer ?? "—"}</td>
                  <td className="px-3 py-2">{d.status ?? "—"}</td>
                  <td className="px-3 py-2">{fd(d.expires_date) || "—"}</td>
                  <td className="px-3 py-2">
                    <DocStateBadge state={docState(d, s.docWarnDays, s.docUrgentDays)} days={daysUntil(d.expires_date)} />
                  </td>
                </ClickRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
