import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import PrintButton from "@core/components/PrintButton";
import { getDb } from "@/lib/db";
import { todayISO } from "@core/lib/format";
import { getClass, classNumberLabel } from "@/lib/classes";
import { getCertification } from "@/lib/certifications";
import { certificatesForPrint } from "@/lib/certificates";
import { holdings } from "@/lib/certifications";
import type { SheetRow } from "@/components/CertificateSheet";
import { getSettings } from "@/lib/settings";
import CertificateSheet from "@/components/CertificateSheet";

export const dynamic = "force-dynamic";

export default async function ClassCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();
  if (!klass.certification_id) notFound();

  const cert = getCertification(db, klass.certification_id);
  if (!cert) notFound();

  const data = certificatesForPrint(db, id, klass.certification_id);
  if (!data) notFound();

  const settings = getSettings(db);
  const today = todayISO();
  const expiry = new Map(holdings(db, klass.certification_id, today).map((h) => [h.student_id, h.expires_on]));
  const standing = db.prepare(
    `select q.latest_percent, q.latest_passed, c.code, c.name
       from student_qualifications q
       join courses_of_fire c on c.id = q.cof_id
      where q.student_id = ? and q.cof_id = ?`
  );

  const sheetRows: SheetRow[] = data.rows.map((r) => ({
    id: r.id,
    number: r.number,
    student_id: r.student_id,
    last_name: r.last_name,
    first_name: r.first_name,
    issued_on: r.issued_on,
    expires_on: expiry.get(r.student_id) ?? null,
    scores: data.courses.map((c) => {
      const row = standing.get(r.student_id, c.cof_id) as
        | { latest_percent: number | null; latest_passed: number | null; code: string | null; name: string }
        | undefined;
      return {
        course: c.code || c.name,
        percent: row?.latest_percent ?? null,
        passed: row?.latest_passed === 1,
      };
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Certificates"
          icon="badge"
          subtitle={`${cert.name} · ${classNumberLabel(klass.number)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <PrintButton />
              <Link className="btn" href={`/classes/${id}`}>
                Back to class
              </Link>
            </div>
          }
        />
        {data.rows.length === 0 ? (
          <p className="mt-4 text-neutral-500">
            No certificates have been issued for this class yet. Issue them from the class page.
          </p>
        ) : null}
      </div>

      <CertificateSheet
        settings={settings.certificate}
        certification={cert}
        courses={data.courses}
        rows={sheetRows}
        dateFormat={settings.dateFormat}
      />
    </div>
  );
}
