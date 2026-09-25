import { ZeroEntry } from "@/components/FirearmLogEntries";
import SuggestInput from "@core/components/SuggestInput";
import SubmitButton from "@core/components/SubmitButton";
import { todayISO } from "@/lib/settings-shared";
import type { ZeroRecord } from "@/lib/db/types";

export default function ZeroSection({ id, zeroRecords, zeroDistances, zeroAction }: { id: string; zeroRecords: ZeroRecord[]; zeroDistances: string[]; zeroAction: (formData: FormData) => Promise<void> }) {
  return (
    <>

        
        <div className="mb-3 flex flex-col gap-2">
          {zeroRecords.map((z) => (
            <ZeroEntry key={JSON.stringify(z)} firearmId={id} entry={z} distances={zeroDistances} />
          ))}
          {zeroRecords.length === 0 && (
            <p className="text-sm text-neutral-500">No zero data logged yet.</p>
          )}
        </div>
        <form action={zeroAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            name="date"
            required
            defaultValue={todayISO()}
            className="input"
          />
          <SuggestInput
            name="distance"
            listId="zero-distances"
            options={zeroDistances}
            placeholder="Distance (e.g. 100 yd)"
          />
          <input
            name="optic"
            placeholder="Optic / sight"
            className="input"
          />
          <input
            name="ammo_description"
            placeholder="Ammo used"
            className="input"
          />
          <input
            name="adjustment"
            placeholder="Adjustment made (windage/elevation)"
            className="input sm:col-span-2"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="input sm:col-span-2"
          />
          <SubmitButton
            className="btn btn-secondary w-fit sm:col-span-2"
          >
            Log Zero
          </SubmitButton>
        </form>
                </>
  );
}
