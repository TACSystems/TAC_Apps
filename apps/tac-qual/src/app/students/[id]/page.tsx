import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import SubmitButton from "@core/components/SubmitButton";
import { getDb } from "@/lib/db";
import { getStudent, studentFirearms, studentName } from "@/lib/students";
import { studentHistory } from "@/lib/records";
import { addFirearm, removeFirearm, removeStudent } from "@/app/students/actions";
import { fd } from "@/lib/display";
import ResultBadge from "@/components/ResultBadge";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const student = getStudent(db, id);
  if (!student) notFound();

  const firearms = studentFirearms(db, id);
  const history = studentHistory(db, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={studentName(student)}
        subtitle={student.email ?? student.phone ?? "No contact details"}
        back={{ href: "/students", label: "Students" }}
        actions={
          <a className="btn btn-primary" href={`/students/${id}/edit`}>
            Edit
          </a>
        }
      />

      <section className="brk card p-5">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Phone</dt>
            <dd>{student.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Email</dt>
            <dd className="break-all">{student.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Date of birth</dt>
            <dd>{student.date_of_birth ? fd(student.date_of_birth) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Emergency contact</dt>
            <dd>
              {student.emergency_contact_name ?? "—"}
              {student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Status</dt>
            <dd className="uppercase">{student.status}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-widest text-neutral-400">Added</dt>
            <dd>{fd(student.created_at.slice(0, 10))}</dd>
          </div>
        </dl>
      </section>

      <Collapsible scope={`student:${id}`} id="firearms" title="Firearms" defaultOpen summary={`${firearms.length} on file`}>
        <div className="space-y-4 p-4">
          {firearms.length === 0 ? (
            <p className="text-neutral-400">No firearms recorded for this student.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Make / Model</th>
                  <th>Caliber</th>
                  <th>Serial</th>
                  <th className="text-right">—</th>
                </tr>
              </thead>
              <tbody>
                {firearms.map((f) => (
                  <tr key={f.id}>
                    <td className="font-bold">{f.make_model}</td>
                    <td>{f.caliber ?? "—"}</td>
                    <td>{f.serial_number ?? "—"}</td>
                    <td className="text-right">
                      <form action={removeFirearm}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="student_id" value={id} />
                        <ConfirmSubmitButton
                          className="btn btn-danger"
                          confirmMessage={`Remove ${f.make_model} from this student?`}
                        >
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form action={addFirearm} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="student_id" value={id} />
            <label className="field">
              <span className="req">Make / Model</span>
              <input className="input" name="make_model" required maxLength={120} />
            </label>
            <label className="field">
              <span>Caliber</span>
              <input className="input" name="caliber" maxLength={40} />
            </label>
            <label className="field">
              <span>Serial</span>
              <input className="input" name="serial_number" maxLength={60} />
            </label>
            <div className="flex items-end">
              <SubmitButton className="btn" pendingLabel="Adding…">
                + Add Firearm
              </SubmitButton>
            </div>
          </form>
        </div>
      </Collapsible>

      <Collapsible
        scope={`student:${id}`}
        id="history"
        title="Qualification History"
        defaultOpen
        summary={`${history.length} course${history.length === 1 ? "" : "s"}`}
      >
        <div className="p-4">
          {history.length === 0 ? (
            <p className="text-neutral-400">This student has not shot a scored course yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th className="text-right">Runs</th>
                  <th className="text-right">Best</th>
                  <th className="text-right">Latest</th>
                  <th>Latest result</th>
                  <th className="text-right">Last passed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.cof_id}>
                    <td className="font-bold">{h.course_name}</td>
                    <td className="text-right">{h.runs}</td>
                    <td className="text-right">{h.best_percent?.toFixed(1) ?? "—"}%</td>
                    <td className="text-right">{h.latest_percent?.toFixed(1) ?? "—"}%</td>
                    <td>
                      <ResultBadge passed={Boolean(h.latest_passed)} />
                    </td>
                    <td className="text-right">{h.last_passed_date ? fd(h.last_passed_date) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Collapsible>

      {student.notes && (
        <Collapsible scope={`student:${id}`} id="notes" title="Notes" defaultOpen={false} summary="">
          <p className="whitespace-pre-wrap p-4 text-neutral-300">{student.notes}</p>
        </Collapsible>
      )}

      <form action={removeStudent} className="pt-4">
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmitButton
          className="btn btn-danger"
          confirmMessage={`Delete ${studentName(student)}? Their scored runs are deleted too. This cannot be undone.`}
        >
          Delete Student
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
