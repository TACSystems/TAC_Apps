import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { updateFirearm, deleteFirearm } from "@/app/inventory/actions";
import {
  logMaintenance,
  logMalfunction,
  logZeroRecord,
  uploadReceiptImage,
  deleteReceiptImage,
} from "./log-actions";

export const dynamic = "force-dynamic";
import FirearmForm from "@/components/FirearmForm";
import ReceiptUploadForm from "@/components/ReceiptUploadForm";
import { maintenanceInfo } from "@/lib/maintenance";
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
  ReceiptImage,
} from "@/lib/db/types";
import { notFound } from "next/navigation";
import Link from "next/link";

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

  const receiptImages = db
    .prepare(`select * from receipt_images where firearm_id = ? order by uploaded_at desc`)
    .all(id) as ReceiptImage[];

  const accessoriesInvestment = accessories.reduce((sum, a) => sum + (a.purchase_value ?? 0), 0);
  const totalInvestment = (firearm.purchase_value ?? 0) + accessoriesInvestment;

  const lastCleaning = maintenanceLog.find((m) => m.type === "cleaning")?.date ?? null;
  const upkeep = maintenanceInfo(
    firearm,
    lastCleaning,
    maintenanceLog[0] ? { date: maintenanceLog[0].date, type: maintenanceLog[0].type } : null
  );

  const updateWithId = updateFirearm.bind(null, id);
  const deleteWithId = deleteFirearm.bind(null, id);
  const maintenanceAction = logMaintenance.bind(null, id);
  const malfunctionAction = logMalfunction.bind(null, id);
  const zeroAction = logZeroRecord.bind(null, id);
  const uploadReceiptAction = uploadReceiptImage.bind(null, id);
  const platformOptions = getDropdownOptions(db, "platform");
  const caliberOptions = getDropdownOptions(db, "caliber");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{firearm.make_model}</h1>
          <form action={deleteWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete ${firearm.make_model}? This also removes its accessories, receipts, maintenance, malfunction, and zero log entries. Its range log history stays on file but will no longer show a linked firearm. This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
        <div className="max-w-2xl">
          <FirearmForm
            firearm={firearm}
            action={updateWithId}
            submitLabel="Save Changes"
            platformOptions={platformOptions}
            caliberOptions={caliberOptions}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-neutral-800 bg-neutral-900 p-4 sm:max-w-2xl sm:grid-cols-4">
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
          <div className="text-lg">${totalInvestment.toLocaleString()}</div>
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
                  : `by ${upkeep.nextDueDate}`}
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Accessories</h2>
        <div className="flex flex-col gap-2">
          {accessories.map((a) => (
            <div
              key={a.id}
              className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              {a.make_model} {a.type ? `· ${a.type}` : ""}
              {a.purchase_value != null ? (
                <span className="text-neutral-500"> · ${a.purchase_value.toLocaleString()}</span>
              ) : null}
            </div>
          ))}
          {accessories.length === 0 && (
            <p className="text-sm text-neutral-500">No accessories linked to this firearm.</p>
          )}
        </div>
        <Link
          href={`/inventory/accessories/new?firearm_id=${id}`}
          className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
        >
          + Add accessory
        </Link>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Receipts</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {receiptImages.map((r) => {
            const isImage = /\.(jpe?g|png|webp|gif)$/i.test(r.file_path);
            const url = `/api/receipts/${r.file_path}`;
            return (
              <div key={r.id} className="border border-neutral-800 bg-neutral-900 p-2 text-xs">
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={r.original_name ?? "Receipt"} className="h-24 w-full object-cover" />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center bg-neutral-950 text-neutral-500">
                      PDF
                    </div>
                  )}
                </a>
                <div className="mt-1 truncate text-neutral-400">{r.original_name}</div>
                <form action={deleteReceiptImage.bind(null, id, r.id, r.file_path)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Delete receipt "${r.original_name ?? "this file"}"?`}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            );
          })}
          {receiptImages.length === 0 && (
            <p className="col-span-full text-sm text-neutral-500">No receipt images uploaded yet.</p>
          )}
        </div>
        <ReceiptUploadForm action={uploadReceiptAction} />
      </section>

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Maintenance / Cleaning</h2>
        <div className="mb-3 flex flex-col gap-2">
          {maintenanceLog.map((m) => (
            <div key={m.id} className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              {m.date} · {m.type}
              {m.shots_fired_at_time != null ? ` · at ${m.shots_fired_at_time} rounds` : ""}
              {m.notes ? <div className="text-neutral-500">{m.notes}</div> : null}
            </div>
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
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <select name="type" className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm">
            <option value="cleaning">Cleaning</option>
            <option value="inspection">Inspection</option>
            <option value="repair">Repair</option>
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
            <div key={m.id} className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              {m.date} · {m.malfunction_type ?? "Unspecified"}
              {m.round_count_at_failure != null ? ` · at ${m.round_count_at_failure} rounds` : ""}
              {m.cause ? <div className="text-neutral-500">Cause: {m.cause}</div> : null}
              {m.notes ? <div className="text-neutral-500">{m.notes}</div> : null}
            </div>
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
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="round_count_at_failure"
            placeholder="Round count at failure"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="malfunction_type"
            placeholder="Type (e.g. failure to feed)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
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
            <div key={z.id} className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              {z.date} · {z.distance ?? "—"} · {z.optic ?? "—"}
              {z.ammo_description ? <div className="text-neutral-500">Ammo: {z.ammo_description}</div> : null}
              {z.adjustment ? <div className="text-neutral-500">Adjustment: {z.adjustment}</div> : null}
              {z.notes ? <div className="text-neutral-500">{z.notes}</div> : null}
            </div>
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
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="distance"
            placeholder="Distance (e.g. 100 yd)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
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
                {l.date} · {l.cof_name ?? "Unlisted course"}
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
