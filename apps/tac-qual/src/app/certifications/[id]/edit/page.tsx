import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import CertificationForm from "@/components/CertificationForm";
import { certificationCourses, courseOptions, getCertification } from "@/lib/certifications";

export const dynamic = "force-dynamic";

export default async function EditCertificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const cert = getCertification(db, id);
  if (!cert) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={cert.name} icon="badge" subtitle="Editing" />
      <CertificationForm
        courses={courseOptions(db)}
        initial={{
          id: cert.id,
          name: cert.name,
          code: cert.code ?? "",
          description: cert.description ?? "",
          certificate_title: cert.certificate_title ?? "",
          certificate_body: cert.certificate_body ?? "",
          cofIds: certificationCourses(db, id).map((c) => c.cof_id),
        }}
      />
    </div>
  );
}
