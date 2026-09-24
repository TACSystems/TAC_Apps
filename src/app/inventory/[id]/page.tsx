import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { updateFirearm, deleteFirearm } from "@/app/inventory/actions";
import {
  logMaintenance,
  logRoundsFired,
  deleteRoundsFired,
  logMalfunction,
  logZeroRecord,
  recordDisposition,
} from "./log-actions";
import { listAttachments } from "@/lib/attachments";
import AttachmentGallery from "@/components/AttachmentGallery";
import {
  DispositionEntry,
  DispositionFields,
  MaintenanceEntry,
  MalfunctionEntry,
  ZeroEntry,
  type Disposition,
} from "@/components/FirearmLogEntries";

export const dynamic = "force-dynamic";
import FirearmForm from "@/components/FirearmForm";
import { maintenanceInfo } from "@/lib/maintenance";
import { getSettings, money } from "@/lib/settings";
import { getMaintenanceTypes } from "@/lib/db/dropdown-options";
import SuggestInput from "@/components/SuggestInput";
import SelectOrOther from "@/components/SelectOrOther";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import type {
  Firearm,
  Accessory,
  RangeLog,
  CourseOfFire,
  MaintenanceLogEntry,
  MalfunctionLogEntry,
  ZeroRecord,
} from "@/lib/db/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { label, fd } from "@/lib/display";
import { todayISO } from "@/lib/settings-shared";

export default async function FirearmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const firearm = db.prepare(`select * from firearms where id = ?`).get(id) as
    | Firearm
    | undefined;

  if (!firearm) notFound();

  const accessories = db
    .prepare(`select * from accessories where firearm_id = ?`)
    .all(id) as Accessory[];

  const logs = db
    .prepare(
      `select rl.*, c.name as cof_name
       from range_log rl
       left join courses_of_fire c on c.id = rl.cof_id
       where rl.firearm_id = ?
       order by rl.date desc`
    )
    .all(id) as (RangeLog & { cof_name: CourseOfFire["name"] | null })[];

  const maintenanceLog = db
    .prepare(`select * from maintenance_log where firearm_id = ? order by date desc`)
    .all(id) as MaintenanceLogEntry[];

  const malfunctionLog = db
    .prepare(`select * from malfunction_log where firearm_id = ? order by date desc`)
    .all(id) as MalfunctionLogEntry[];

  const zeroRecords = db
    .prepare(`select * from zero_records where firearm_id = ? order by date desc`)
    .all(id) as ZeroRecord[];

  const photos = listAttachments(db, "firearm", id, ["photo"]);
  const receipts = listAttachments(db, "firearm", id, ["receipt", "document"]);
  const billsOfSale = listAttachments(db, "firearm", id, ["bill_of_sale"]);
  const dispositions = db
    .prepare(`select * from firearm_dispositions where firearm_id = ? order by date desc, created_at desc`)
    .all(id) as Disposition[];
  const pastMounts = db
    .prepare(
      `select m.id, m.from_date, m.to_date, a.id as accessory_id, a.make_model
       from accessory_mounts m join accessories a on a.id = m.accessory_id
       where m.firearm_id = ? and m.to_date is not null order by m.to_date desc`
    )
    .all(id) as { id: string; from_date: string | null; to_date: string; accessory_id: string; make_model: string }[];

  const accessoriesInvestment = accessories.reduce((sum, a) => sum + (a.purchase_value ?? 0), 0);
  const totalInvestment = (firearm.purchase_value ?? 0) + accessoriesInvestment;

  const settings = getSettings(db);
  const roundsLog = db
    .prepare(`select * from rounds_fired_log where firearm_id = ? order by date desc, created_at desc`)
    .all(id) as {
    id: string;
    date: string;
    rounds: number;
    caliber: string | null;
    ammo_lot: string | null;
    deduct_from_ammo: number;
    notes: string | null;
  }[];
  const maintenanceTypes = getMaintenanceTypes(db);
  const malfunctionTypes = getDropdownOptions(db, "malfunction_type");
  const zeroDistances = getDropdownOptions(db, "zero_distance");

  const lastCleaning = maintenanceLog.find((m) => m.type.toLowerCase() === "cleaning")?.date ?? null;
  const upkeep = maintenanceInfo(
    firearm,
    lastCleaning,
    maintenanceLog[0] ? { date: maintenanceLog[0].date, type: maintenanceLog[0].type } : null,
    settings.dueSoonPercent / 100
  );

  const updateWithId = updateFirearm.bind(null, id);
  const deleteWithId = deleteFirearm.bind(null, id);
  const maintenanceAction = logMaintenance.bind(null, id);
  const malfunctionAction = logMalfunction.bind(null, id);
  const zeroAction = logZeroRecord.bind(null, id);
  const platformOptions = getDropdownOptions(db, "platform");
  const caliberOptions = getDropdownOptions(db, "caliber");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/inventory" className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Armory
        </Link>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{label(firearm)}</h1>
            {firearm.nickname && label(firearm) === firearm.nickname && (
              <p className="text-sm text-neutral-400">{firearm.make_model}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
          <Link href={`/inventory/new?from=${firearm.id}`} className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700">
            Add Another Like This
          </Link>
          <form action={deleteWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete ${label(firearm)}? This also removes its photos, receipts, sale records, maintenance, malfunction, and zero log entries. Its accessories and range log history stay on file but will no longer show a linked firearm. This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
          </div>
        </div>
        <div className="max-w-4xl">
          <FirearmForm
            firearm={firearm}
            action={updateWithId}
            submitLabel="Save Changes"
            platformOptions={platformOptions}
            caliberOptions={caliberOptions}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-neutral-800 bg-neutral-900 p-4 sm:max-w-4xl sm:grid-cols-4">
        <div>
          <div className="text-xs text-neutral-500">Shots Fired</div>
          <div className="text-lg">{firearm.shots_fired}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Malfunctions</div>
          <div className="text-lg">{firearm.malfunctions + malfunctionLog.length}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Total Investment</div>
          <div className="text-lg">{money(totalInvestment, settings.currencySymbol)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Cleaning</div>
          <div
            className={`text-lg ${
              upkeep.status === "due" ? "text-red-400" : upkeep.status === "soon" ? "text-amber-400" : ""
            }`}
          >
            {upkeep.status === "unset"
              ? "—"
              : upkeep.status === "due"
                ? "Due"
                : firearm.clean_interval_rounds
                  ? `${upkeep.roundsSince}/${firearm.clean_interval_rounds}`
                  : `by ${fd(upkeep.nextDueDate)}`}
          </div>
        </div>
      </div>

      <section id="rounds-fired">
        <h2 className="mb-1 font-medium text-neutral-200">Update Rounds Fired</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Record rounds fired outside a logged range session (practice, plinking, function checks). Adds to this
          firearm&apos;s shot count and cleaning counter.
        </p>
        <form action={logRoundsFired.bind(null, id)} className="grid grid-cols-1 gap-2 sm:max-w-4xl sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            Date
            <input
              type="date"
              name="date"
              required
              defaultValue={todayISO()}
              className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Rounds
            <input
              type="number"
              name="rounds"
              min={1}
              required
              placeholder="e.g. 100"
              className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Caliber
            <SelectOrOther name="caliber" options={caliberOptions} defaultValue={firearm.caliber} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Ammo Lot #
            <input name="ammo_lot" placeholder="Optional" className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          </label>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex items-center gap-2 text-xs normal-case sm:col-span-2">
            <input type="checkbox" name="deduct_from_ammo" defaultChecked={settings.deductManualRoundsByDefault} />
            Deduct from ammo on hand
          </label>
          <SubmitButton
            pendingLabel="Recording…"
            className="w-fit bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light sm:col-span-4"
          >
            Record Rounds Fired
          </SubmitButton>
        </form>
        {roundsLog.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 sm:max-w-4xl">
            {roundsLog.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
              >
                <span>
                  {fd(r.date)} · {r.rounds} rds{r.caliber ? ` · ${r.caliber}` : ""}
                  {r.ammo_lot ? ` · Lot ${r.ammo_lot}` : ""}
                  {!r.deduct_from_ammo ? <span className="text-neutral-500"> · not deducted from ammo</span> : null}
                  {r.notes ? <span className="text-neutral-500"> · {r.notes}</span> : null}
                </span>
                <form action={deleteRoundsFired.bind(null, id, r.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remove this entry? ${r.rounds} rounds will be subtracted from this firearm's shot count${
                      r.deduct_from_ammo ? " and added back to ammo on hand" : ""
                    }.`}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
            {roundsLog.length > 10 && (
              <p className="text-xs text-neutral-500">Showing the latest 10 of {roundsLog.length} entries.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Accessories</h2>
        <div className="flex flex-col gap-2">
          {accessories.map((a) => (
            <Link
              key={a.id}
              href={`/inventory/accessories/${a.id}`}
              className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
            >
              {a.make_model} {a.type ? `· ${a.type}` : ""}
              {a.serial_number ? <span className="text-neutral-500"> · SN {a.serial_number}</span> : null}
              {a.purchase_value != null ? (
                <span className="text-neutral-500"> · {money(a.purchase_value, settings.currencySymbol)}</span>
              ) : null}
            </Link>
          ))}
          {accessories.length === 0 && (
            <p className="text-sm text-neutral-500">No accessories linked to this firearm.</p>
          )}
        </div>
        <Link
          href={`/inventory/accessories/new?firearm_id=${id}`}
          className="mt-2 inline-block text-sm text-brand-amber hover:text-brand-amber-light"
        >
          + Add accessory
        </Link>
        {pastMounts.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="mb-1 text-xs text-neutral-500">Previously mounted</div>
            {pastMounts.map((m) => (
              <div key={m.id} className="text-neutral-400">
                <Link href={`/inventory/accessories/${m.accessory_id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {m.make_model}
                </Link>{" "}
                · {fd(m.from_date) || "?"} → {fd(m.to_date)}
              </div>
            ))}
          </div>
        )}
      </section>

      <AttachmentGallery
        id="photos"
        title="Photos"
        items={photos}
        ownerType="firearm"
        ownerId={id}
        kind="photo"
        imagesOnly
        emptyText="No photos yet. Photos of each side and the serial number help with insurance claims."
      />

      <AttachmentGallery
        id="receipts"
        title="Receipts & Documents"
        items={receipts}
        ownerType="firearm"
        ownerId={id}
        kind="receipt"
        emptyText="No receipts uploaded yet."
      />

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Maintenance / Cleaning</h2>
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
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <select name="type" defaultValue="Cleaning" className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm">
            {maintenanceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <SubmitButton
            className="w-fit border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 sm:col-span-3"
          >
            Log Entry
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Malfunction History</h2>
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
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="round_count_at_failure"
            placeholder="Round count at failure"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
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
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <SubmitButton
            className="w-fit border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 sm:col-span-2"
          >
            Log Malfunction
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Zero Log</h2>
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
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
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
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="ammo_description"
            placeholder="Ammo used"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="adjustment"
            placeholder="Adjustment made (windage/elevation)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <SubmitButton
            className="w-fit border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 sm:col-span-2"
          >
            Log Zero
          </SubmitButton>
        </form>
      </section>

      <section id="disposition">
        <h2 className="mb-1 font-medium text-neutral-200">Sale / Transfer Record</h2>
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
          <summary className="inline-block cursor-pointer list-none border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{dispositions.length ? "+ Add Another Record" : "+ Record Sale / Transfer"}</span>
            <span className="hidden group-open:inline">Cancel</span>
          </summary>
          <form action={recordDisposition.bind(null, id)} className="mt-2 grid grid-cols-1 gap-2 border border-neutral-800 bg-neutral-900/50 p-3 sm:grid-cols-2">
            <DispositionFields />
            <label className="flex items-center gap-2 text-xs normal-case sm:col-span-2">
              <input type="checkbox" name="mark_disposed" defaultChecked={firearm.status !== "sold"} />
              Set this firearm&apos;s status to Sold (removes it from the maintenance schedule and active lists)
            </label>
            <SubmitButton className="w-fit bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light">
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
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Range Log</h2>
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Link
              key={l.id}
              href={`/range-log/${l.id}`}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
            >
              <span>
                {fd(l.date)} · {l.cof_name ?? "Unlisted course"}
              </span>
              <span className="text-neutral-400">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
              </span>
            </Link>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-neutral-500">No range log entries for this firearm.</p>
          )}
        </div>
      </section>
    </div>
  );
}
