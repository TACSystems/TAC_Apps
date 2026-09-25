import { MaintenanceEntry } from "@/components/FirearmLogEntries";
import SubmitButton from "@core/components/SubmitButton";
import { todayISO } from "@/lib/settings-shared";
import type { MaintenanceLogEntry } from "@/lib/db/types";

export default function MaintenanceSection({ id, maintenanceLog, maintenanceTypes, maintenanceAction }: { id: string; maintenanceLog: MaintenanceLogEntry[]; maintenanceTypes: string[]; maintenanceAction: (formData: FormData) => Promise<void> }) {
  return (
    <>

        
        <div className="mb-3 flex flex-col gap-2">
          {maintenanceLog.map((m) => (
            <MaintenanceEntry key={JSON.stringify(m)} firearmId={id} entry={m} types={maintenanceTypes} />
          ))}
          {maintenanceLog.length === 0 && (
            <p className="text-sm text-neutral-500">No maintenance logged yet.</p>
          )}
        </div>
        <form action={maintenanceAction} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="date"
            name="date"
            required
            defaultValue={todayISO()}
            className="input"
          />
          <select name="type" defaultValue="Cleaning" className="input">
            {maintenanceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="input"
          />
          <SubmitButton
            className="btn btn-secondary w-fit sm:col-span-3"
          >
            Log Entry
          </SubmitButton>
        </form>
                </>
  );
}
