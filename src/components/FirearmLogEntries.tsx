import type { MaintenanceLogEntry, MalfunctionLogEntry, ZeroRecord } from "@/lib/db/types";
import {
  deleteDisposition,
  deleteMaintenance,
  deleteMalfunction,
  deleteZero,
  updateDisposition,
  updateMaintenance,
  updateMalfunction,
  updateZero,
} from "@/app/inventory/[id]/log-actions";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SuggestInput from "@/components/SuggestInput";
import { money } from "@/lib/settings-shared";
import { fd } from "@/lib/display";

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm";
const saveBtn = "w-fit border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-700";
const delBtn = "text-xs text-red-400 hover:text-red-300";

function Shell({
  summary,
  children,
  deleteAction,
  confirm,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  deleteAction: () => Promise<void>;
  confirm: string;
}) {
  return (
    <details className="group border border-neutral-800 bg-neutral-900 text-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>{summary}</div>
        <span className="shrink-0 border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs group-open:hidden">Edit</span>
        <span className="hidden shrink-0 border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 group-open:inline">Close</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-neutral-800 px-3 py-3">
        {children}
        <form action={deleteAction}>
          <ConfirmSubmitButton confirmMessage={confirm} className={delBtn}>
            Delete entry
          </ConfirmSubmitButton>
        </form>
      </div>
    </details>
  );
}

export function MaintenanceEntry({
  firearmId,
  entry,
  types,
}: {
  firearmId: string;
  entry: MaintenanceLogEntry;
  types: string[];
}) {
  const options = types.includes(entry.type) ? types : [entry.type, ...types];
  return (
    <Shell
      summary={
        <>
          {fd(entry.date)} · {entry.type}
          {entry.shots_fired_at_time != null ? ` · at ${entry.shots_fired_at_time} rounds` : ""}
          {entry.notes ? <div className="text-neutral-500">{entry.notes}</div> : null}
        </>
      }
      deleteAction={deleteMaintenance.bind(null, firearmId, entry.id)}
      confirm={`Delete this ${entry.type.toLowerCase()} entry from ${fd(entry.date)}?`}
    >
      <form action={updateMaintenance.bind(null, firearmId, entry.id)} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input type="date" name="date" required defaultValue={entry.date} className={input} />
        <select name="type" defaultValue={entry.type} className={input}>
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="shots_fired_at_time"
          defaultValue={entry.shots_fired_at_time ?? ""}
          placeholder="Round count at time"
          title="Firearm's total round count when this was done"
          className={input}
        />
        <input name="notes" defaultValue={entry.notes ?? ""} placeholder="Notes" className={input} />
        <SubmitButton className={saveBtn}>Save</SubmitButton>
      </form>
    </Shell>
  );
}

export function MalfunctionEntry({
  firearmId,
  entry,
  types,
}: {
  firearmId: string;
  entry: MalfunctionLogEntry;
  types: string[];
}) {
  return (
    <Shell
      summary={
        <>
          {fd(entry.date)} · {entry.malfunction_type ?? "Unspecified"}
          {entry.round_count_at_failure != null ? ` · at ${entry.round_count_at_failure} rounds` : ""}
          {entry.cause ? <div className="text-neutral-500">Cause: {entry.cause}</div> : null}
          {entry.notes ? <div className="text-neutral-500">{entry.notes}</div> : null}
        </>
      }
      deleteAction={deleteMalfunction.bind(null, firearmId, entry.id)}
      confirm={`Delete this malfunction entry from ${fd(entry.date)}?`}
    >
      <form action={updateMalfunction.bind(null, firearmId, entry.id)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="date" name="date" required defaultValue={entry.date} className={input} />
        <input
          type="number"
          name="round_count_at_failure"
          defaultValue={entry.round_count_at_failure ?? ""}
          placeholder="Round count at failure"
          className={input}
        />
        <SuggestInput
          name="malfunction_type"
          listId={`mt-${entry.id}`}
          options={types}
          defaultValue={entry.malfunction_type}
          placeholder="Type"
          className={input}
        />
        <input name="cause" defaultValue={entry.cause ?? ""} placeholder="Cause" className={input} />
        <input name="notes" defaultValue={entry.notes ?? ""} placeholder="Notes" className={`${input} sm:col-span-2`} />
        <SubmitButton className={saveBtn}>Save</SubmitButton>
      </form>
    </Shell>
  );
}

export function ZeroEntry({ firearmId, entry, distances }: { firearmId: string; entry: ZeroRecord; distances: string[] }) {
  return (
    <Shell
      summary={
        <>
          {fd(entry.date)} · {entry.distance ?? "—"} · {entry.optic ?? "—"}
          {entry.ammo_description ? <div className="text-neutral-500">Ammo: {entry.ammo_description}</div> : null}
          {entry.adjustment ? <div className="text-neutral-500">Adjustment: {entry.adjustment}</div> : null}
          {entry.notes ? <div className="text-neutral-500">{entry.notes}</div> : null}
        </>
      }
      deleteAction={deleteZero.bind(null, firearmId, entry.id)}
      confirm={`Delete this zero record from ${fd(entry.date)}?`}
    >
      <form action={updateZero.bind(null, firearmId, entry.id)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="date" name="date" required defaultValue={entry.date} className={input} />
        <SuggestInput
          name="distance"
          listId={`zd-${entry.id}`}
          options={distances}
          defaultValue={entry.distance}
          placeholder="Distance"
          className={input}
        />
        <input name="optic" defaultValue={entry.optic ?? ""} placeholder="Optic / sight" className={input} />
        <input name="ammo_description" defaultValue={entry.ammo_description ?? ""} placeholder="Ammo used" className={input} />
        <input
          name="adjustment"
          defaultValue={entry.adjustment ?? ""}
          placeholder="Adjustment made"
          className={`${input} sm:col-span-2`}
        />
        <input name="notes" defaultValue={entry.notes ?? ""} placeholder="Notes" className={`${input} sm:col-span-2`} />
        <SubmitButton className={saveBtn}>Save</SubmitButton>
      </form>
    </Shell>
  );
}

export type Disposition = {
  id: string;
  date: string;
  type: string;
  recipient_name: string | null;
  recipient_ffl: string | null;
  recipient_address: string | null;
  price: number | null;
  notes: string | null;
};

export const DISPOSITION_TYPES = ["Sold", "Transferred", "Traded", "Gifted", "Inherited Out", "Lost", "Stolen", "Destroyed", "Other"];

export function DispositionFields({ d }: { d?: Disposition }) {
  return (
    <>
      <input type="date" name="date" required defaultValue={d?.date ?? new Date().toISOString().slice(0, 10)} className={input} />
      <select name="type" defaultValue={d?.type ?? "Sold"} className={input}>
        {(d && !DISPOSITION_TYPES.includes(d.type) ? [d.type, ...DISPOSITION_TYPES] : DISPOSITION_TYPES).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input name="recipient_name" defaultValue={d?.recipient_name ?? ""} placeholder="Buyer / recipient name" className={input} />
      <input name="recipient_ffl" defaultValue={d?.recipient_ffl ?? ""} placeholder="Recipient FFL # (if any)" className={input} />
      <input
        name="recipient_address"
        defaultValue={d?.recipient_address ?? ""}
        placeholder="Recipient address / contact"
        className={`${input} sm:col-span-2`}
      />
      <input type="number" step="0.01" name="price" defaultValue={d?.price ?? ""} placeholder="Price" className={input} />
      <input name="notes" defaultValue={d?.notes ?? ""} placeholder="Notes (police report #, 4473, etc.)" className={input} />
    </>
  );
}

export function DispositionEntry({ firearmId, entry, currency }: { firearmId: string; entry: Disposition; currency: string }) {
  return (
    <Shell
      summary={
        <>
          {fd(entry.date)} · {entry.type}
          {entry.recipient_name ? ` · ${entry.recipient_name}` : ""}
          {entry.recipient_ffl ? ` · FFL ${entry.recipient_ffl}` : ""}
          {entry.price != null ? ` · ${money(entry.price, currency)}` : ""}
          {entry.recipient_address ? <div className="text-neutral-500">{entry.recipient_address}</div> : null}
          {entry.notes ? <div className="text-neutral-500">{entry.notes}</div> : null}
        </>
      }
      deleteAction={deleteDisposition.bind(null, firearmId, entry.id)}
      confirm={`Delete this ${entry.type.toLowerCase()} record? The firearm's status isn't changed.`}
    >
      <form action={updateDisposition.bind(null, firearmId, entry.id)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DispositionFields d={entry} />
        <SubmitButton className={saveBtn}>Save</SubmitButton>
      </form>
    </Shell>
  );
}
