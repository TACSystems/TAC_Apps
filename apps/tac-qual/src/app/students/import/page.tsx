import PageHeader from "@core/components/PageHeader";
import FileDrop from "@core/components/FileDrop";
import SubmitButton from "@core/components/SubmitButton";
import { importStudentsAction } from "./actions";

export default function ImportStudentsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Import Students" subtitle="A CSV class list" back={{ href: "/students", label: "Students" }} />
      <form action={importStudentsAction} className="card space-y-4 p-4">
        <FileDrop name="file" accept=".csv,text/csv" label="Select CSV File" />
        <SubmitButton className="btn btn-primary" pendingLabel="Importing…">
          Import Students
        </SubmitButton>
      </form>

      <section className="card space-y-2 p-4 text-sm text-neutral-400">
        <h2 className="text-xs tracking-widest text-neutral-300">Columns it recognises</h2>
        <p>
          Last Name, First Name, Email, Phone, Address, Date of Birth, Notes, Emergency Contact, Emergency Phone.
          A single Name column works too — &quot;Reyes, Marisol&quot; or &quot;Marisol Reyes&quot;.
        </p>
        <p>
          A student whose first and last name already exist is updated rather than duplicated, so re-importing a
          corrected sheet is safe.
        </p>
      </section>
    </div>
  );
}
