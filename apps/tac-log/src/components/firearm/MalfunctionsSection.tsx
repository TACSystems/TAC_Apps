import { MalfunctionEntry } from "@/components/FirearmLogEntries";
import SuggestInput from "@core/components/SuggestInput";
import SubmitButton from "@core/components/SubmitButton";
import { todayISO } from "@/lib/settings-shared";
import type { MalfunctionLogEntry } from "@/lib/db/types";

export default function MalfunctionsSection({ id, malfunctionLog, malfunctionTypes, malfunctionAction }: { id: string; malfunctionLog: MalfunctionLogEntry[]; malfunctionTypes: string[]; malfunctionAction: (formData: FormData) => Promise<void> }) {
  return (
    <>

        
        <div className="mb-3 flex flex-col gap-2">
          {malfunctionLog.map((m) => (
            <MalfunctionEntry key={JSON.stringify(m)} firearmId={id} entry={m} types={malfunctionTypes} />
          ))}
          {malfunctionLog.length === 0 && (
            <p className="text-sm text-neutral-500">No malfunctions logged yet.</p>
          )}
        </div>
        <form action={malfunctionAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            name="date"
            required
            defaultValue={todayISO()}
            className="input"
          />
          <input
            type="number"
            name="round_count_at_failure"
            placeholder="Round count at failure"
            className="input"
          />
          <SuggestInput
            name="malfunction_type"
            listId="malfunction-types"
            options={malfunctionTypes}
            placeholder="Type (e.g. failure to feed)"
          />
          <input
            name="cause"
            placeholder="Cause (optional)"
            className="input"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="input sm:col-span-2"
          />
          <SubmitButton
            className="btn btn-secondary w-fit sm:col-span-2"
          >
            Log Malfunction
          </SubmitButton>
        </form>
                </>
  );
}
