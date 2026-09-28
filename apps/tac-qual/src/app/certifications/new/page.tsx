import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import CertificationForm from "@/components/CertificationForm";
import { courseOptions } from "@/lib/certifications";

export const dynamic = "force-dynamic";

export default async function NewCertificationPage() {
  const courses = courseOptions(getDb());
  return (
    <div className="space-y-6">
      <PageHeader title="New Certification" icon="badge" />
      <CertificationForm
        courses={courses}
        initial={{ name: "", code: "", description: "", certificate_title: "", certificate_body: "", cofIds: [] }}
      />
    </div>
  );
}
