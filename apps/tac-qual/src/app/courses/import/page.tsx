import PageHeader from "@core/components/PageHeader";
import FileDrop from "@core/components/FileDrop";
import SubmitButton from "@core/components/SubmitButton";
import { importCourses } from "./actions";

export default function ImportCoursesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Import Courses of Fire"
        subtitle="Course files exported from TAC-LOG or another TAC-QUAL install"
        back={{ href: "/courses", label: "Courses of Fire" }}
      />
      <form action={importCourses} className="card space-y-4 p-4">
        <FileDrop name="file" accept="application/json,.json" multiple label="Select Course Files" />
        <SubmitButton className="btn btn-primary" pendingLabel="Importing…">
          Import Courses
        </SubmitButton>
        <p className="text-xs text-neutral-500">
          A course whose code already exists is updated in place. Scores already recorded against it are kept.
        </p>
      </form>
    </div>
  );
}
