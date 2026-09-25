import SubmitButton from "@core/components/SubmitButton";
import UnsavedGuard from "@core/components/UnsavedGuard";
import { saveStudent } from "@/app/students/actions";
import type { Student } from "@/lib/students";

export default function StudentForm({ student }: { student?: Student | null }) {
  const s = student ?? null;
  return (
    <form action={saveStudent} className="space-y-6">
      <UnsavedGuard />
      {s && <input type="hidden" name="id" value={s.id} />}

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 text-xs tracking-widest text-neutral-400">Student</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="req">Last name</span>
            <input className="input" name="last_name" defaultValue={s?.last_name ?? ""} required maxLength={80} />
          </label>
          <label className="field">
            <span className="req">First name</span>
            <input className="input" name="first_name" defaultValue={s?.first_name ?? ""} required maxLength={80} />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" defaultValue={s?.email ?? ""} maxLength={160} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="phone" defaultValue={s?.phone ?? ""} maxLength={40} />
          </label>
          <label className="field sm:col-span-2">
            <span>Address</span>
            <input className="input" name="address" defaultValue={s?.address ?? ""} maxLength={300} />
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input className="input" type="date" name="date_of_birth" defaultValue={s?.date_of_birth ?? ""} />
          </label>
          <label className="field">
            <span>Status</span>
            <select className="input" name="status" defaultValue={s?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 text-xs tracking-widest text-neutral-400">Emergency contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Name</span>
            <input className="input" name="emergency_contact_name" defaultValue={s?.emergency_contact_name ?? ""} maxLength={120} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="emergency_contact_phone" defaultValue={s?.emergency_contact_phone ?? ""} maxLength={40} />
          </label>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 text-xs tracking-widest text-neutral-400">Notes</legend>
        <label className="field">
          <span className="sr-only">Notes</span>
          <textarea className="input min-h-24" name="notes" defaultValue={s?.notes ?? ""} maxLength={2000} />
        </label>
      </fieldset>

      <div className="flex gap-3">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {s ? "Save Student" : "Add Student"}
        </SubmitButton>
        <a className="btn" href={s ? `/students/${s.id}` : "/students"}>
          Cancel
        </a>
      </div>
    </form>
  );
}
