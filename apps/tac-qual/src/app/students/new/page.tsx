import PageHeader from "@core/components/PageHeader";
import StudentForm from "@/components/StudentForm";

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add Student" back={{ href: "/students", label: "Students" }} />
      <StudentForm />
    </div>
  );
}
