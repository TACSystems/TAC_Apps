import SubmitButton from "@/components/SubmitButton";
import UnsavedGuard from "@/components/UnsavedGuard";
import { DOC_TYPES, NFA_STATUSES, type DocRow } from "@/lib/documents";

const input = "border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case";

export default function DocumentForm({
  doc,
  firearms,
  action,
  submitLabel,
}: {
  doc?: DocRow;
  firearms: { id: string; label: string }[];
  action: (fd: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UnsavedGuard />
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select name="doc_type" defaultValue={doc?.doc_type ?? "Carry Permit"} className={input}>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Name / Title
        <input name="title" required defaultValue={doc?.title ?? ""} placeholder="e.g. Texas LTC, Suppressor tax stamp" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Issued by (state / agency / club)
        <input name="issuer" defaultValue={doc?.issuer ?? ""} placeholder="e.g. Texas DPS, ATF" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Number
        <input name="number" defaultValue={doc?.number ?? ""} placeholder="Permit / license / control number" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Holder
        <input name="holder" defaultValue={doc?.holder ?? ""} placeholder="Whose name it's in" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Linked Firearm (NFA items)
        <select name="firearm_id" defaultValue={doc?.firearm_id ?? ""} className={input}>
          <option value="">— None —</option>
          {firearms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status (NFA / applications)
        <select name="status" defaultValue={doc?.status ?? ""} className={input}>
          <option value="">— Not applicable —</option>
          {NFA_STATUSES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Issued / Approved
          <input type="date" name="issued_date" defaultValue={doc?.issued_date ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Expires
          <input type="date" name="expires_date" defaultValue={doc?.expires_date ?? ""} className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notes
        <textarea name="notes" rows={2} defaultValue={doc?.notes ?? ""} placeholder="Renewal steps, reciprocity notes, examiner, etc." className={input} />
      </label>
      <SubmitButton className="w-fit bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">{submitLabel}</SubmitButton>
    </form>
  );
}
