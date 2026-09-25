import { recordDisposition } from "@/app/inventory/[id]/log-actions";
import AttachmentGallery from "@/components/AttachmentGallery";
import { DispositionEntry, DispositionFields, type Disposition } from "@/components/FirearmLogEntries";
import SubmitButton from "@core/components/SubmitButton";
import type { Firearm } from "@/lib/db/types";
import type { AppSettings } from "@/lib/settings-shared";
import type { Attachment } from "@/lib/attachments";

export default function DispositionSection({ id, firearm, settings, dispositions, billsOfSale }: { id: string; firearm: Firearm; settings: AppSettings; dispositions: Disposition[]; billsOfSale: Attachment[] }) {
  return (
    <>

        
        <p className="mb-3 text-sm text-neutral-400">
          Record when this firearm leaves your possession: sold, transferred, traded, lost, or stolen.
        </p>
        {dispositions.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {dispositions.map((d) => (
              <DispositionEntry key={JSON.stringify(d)} firearmId={id} entry={d} currency={settings.currencySymbol} />
            ))}
          </div>
        )}
        <details className="group" open={dispositions.length === 0 && firearm.status === "sold"}>
          <summary className="btn btn-secondary inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{dispositions.length ? "+ Add Another Record" : "+ Record Sale / Transfer"}</span>
            <span className="hidden group-open:inline">Cancel</span>
          </summary>
          <form action={recordDisposition.bind(null, id)} className="mt-2 grid grid-cols-1 gap-2 border border-neutral-800 bg-neutral-900/50 p-3 sm:grid-cols-2">
            <DispositionFields />
            <label className="flex items-center gap-2 text-xs normal-case sm:col-span-2">
              <input type="checkbox" name="mark_disposed" defaultChecked={firearm.status !== "sold"} />
              Set this firearm&apos;s status to Sold (removes it from the maintenance schedule and active lists)
            </label>
            <SubmitButton className="btn btn-primary w-fit">
              Save Record
            </SubmitButton>
          </form>
        </details>
        {(dispositions.length > 0 || billsOfSale.length > 0) && (
          <div className="mt-4">
            <AttachmentGallery
              title="Bill of Sale / Transfer Paperwork"
              items={billsOfSale}
              ownerType="firearm"
              ownerId={id}
              kind="bill_of_sale"
              emptyText="No paperwork uploaded yet."
            />
          </div>
        )}
                </>
  );
}
