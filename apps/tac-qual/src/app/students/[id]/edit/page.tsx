import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import StudentForm from "@/components/StudentForm";
import { getDb } from "@/lib/db";
import { getStudent, studentName } from "@/lib/students";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = getStudent(getDb(), id);
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${studentName(student)}`}
        back={{ href: `/students/${id}`, label: studentName(student) }}
      />
      <StudentForm student={student} />
    </div>
  );
}
