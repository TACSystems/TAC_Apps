import type { Participant } from "@/lib/db/types";
import SubmitButton from "@/components/SubmitButton";

export default function ParticipantForm({
  participant,
  action,
  submitLabel,
}: {
  participant?: Participant;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Name
        <input
          name="name"
          required
          defaultValue={participant?.name}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          defaultValue={participant?.email ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input
          name="phone"
          defaultValue={participant?.phone ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={participant?.status ?? "active"}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={participant?.notes ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </label>
      <SubmitButton
        className="mt-2 w-fit rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 sm:col-span-2"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
