import SubmitButton from "@core/components/SubmitButton";
import UnsavedGuard from "@core/components/UnsavedGuard";
import { saveClass } from "@/app/classes/actions";
import type { ClassRow } from "@/lib/classes";

export default function ClassForm({
  klass,
  defaultLocation = "",
  today,
}: {
  klass?: ClassRow | null;
  defaultLocation?: string;
  today: string;
}) {
  const c = klass ?? null;
  return (
    <form action={saveClass} className="space-y-6">
      <UnsavedGuard />
      {c && <input type="hidden" name="id" value={c.id} />}

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 text-xs tracking-widest text-neutral-400">Class</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="req">Title</span>
            <input
              className="input"
              name="title"
              defaultValue={c?.title ?? ""}
              placeholder="Defensive Handgun — Level 1"
              required
              maxLength={140}
            />
          </label>
          <label className="field">
            <span className="req">Date</span>
            <input className="input" type="date" name="date" defaultValue={c?.date ?? today} required />
          </label>
          <label className="field">
            <span>Location</span>
            <input className="input" name="location" defaultValue={c?.location ?? defaultLocation} maxLength={160} />
          </label>
          <label className="field">
            <span>Status</span>
            <select className="input" name="status" defaultValue={c?.status ?? "planned"}>
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea className="input min-h-24" name="notes" defaultValue={c?.notes ?? ""} maxLength={2000} />
        </label>
      </fieldset>

      <div className="flex gap-3">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {c ? "Save Class" : "Create Class"}
        </SubmitButton>
        <a className="btn" href={c ? `/classes/${c.id}` : "/classes"}>
          Cancel
        </a>
      </div>
    </form>
  );
}
