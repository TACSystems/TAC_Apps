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
import CountCorrector from "@/components/CountCorrector";
import { firearmAdjustments, listCounters } from "@/lib/counts";
import { correctFirearm, createCounter, removeAdjustment, removeCounter, replaceCounter } from "@/app/counts/actions";
import HelpTip from "@/components/HelpTip";
import Collapsible from "@/components/Collapsible";
import SectionTools from "@/components/SectionTools";
import { pageSections } from "@/lib/page-sections";
import AmmoPickField from "@/components/AmmoPickField";
import { defaultPickFor } from "@/lib/ammo-pick";
import { lastPicks, pickLabel, pickOptions } from "@/lib/ammo";
import { sessionNo } from "@/lib/sessions";

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
  const adjustments = firearmAdjustments(db, id);
  const counters = listCounters(db, id);
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
    range_location: string | null;
    session_id: string | null;
    ammo_type: string | null;
    ammo_grain: number | null;
    ammo_manufacturer: string | null;
  }[];
  const sessions = db
    .prepare(
      `select s.id, s.number, s.date, s.location,
         coalesce((select sum(coalesce(rounds_fired, 0)) from range_log where session_id = s.id and firearm_id = @id), 0)
           + coalesce((select sum(rounds) from rounds_fired_log where session_id = s.id and firearm_id = @id), 0) as rounds
       from range_sessions s
       where exists (select 1 from range_log where session_id = s.id and firearm_id = @id)
          or exists (select 1 from rounds_fired_log where session_id = s.id and firearm_id = @id)
       order by s.date desc, s.number desc`
    )
    .all({ id }) as { id: string; number: number; date: string; location: string | null; rounds: number }[];
  const open = pageSections(db, "firearm");
  const ammoOptions = pickOptions(db);
  const rangeLocations = getDropdownOptions(db, "range_location");
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

  const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const lastOf = (d?: string | null) => (d ? ` · last ${fd(d)}` : "");

  return (
    <div data-scope="firearm" className="flex flex-col gap-4">
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
      </div>
      <div className="grid grid-cols-2 gap-4 border border-neutral-800 bg-neutral-900 p-4 sm:max-w-4xl sm:grid-cols-4">
        <div>
          <div className="text-xs text-neutral-500">Shots Fired</div>
          <div className="text-lg">{firearm.shots_fired.toLocaleString()}</div>
          <CountCorrector
            current={firearm.shots_fired}
            help="Set this firearm's lifetime rounds fired, e.g. it came used or some trips were never logged. The cleaning counter and part counters are not affected."
            save={correctFirearm.bind(null, id)}
          />
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

      <div className="sm:max-w-4xl">
        <SectionTools scope="firearm" remember />
      </div>

      <Collapsible id="details" scope="firearm" title="Firearm Details" defaultOpen={open("details", false)}
        summary={[firearm.caliber, firearm.platform, firearm.serial_number ? `SN ${firearm.serial_number}` : null, firearm.status].filter(Boolean).join(" · ")}>
        <div className="max-w-4xl">
          <FirearmForm
            firearm={firearm}
            action={updateWithId}
            submitLabel="Save Changes"
            platformOptions={platformOptions}
            caliberOptions={caliberOptions}
          />
        </div>
      </Collapsible>

      <Collapsible id="rounds-fired" scope="firearm" title="Update Rounds Fired" defaultOpen={open("rounds-fired", true)}
        summary={`${firearm.shots_fired.toLocaleString()} lifetime${roundsLog[0] ? lastOf(roundsLog[0].date) : ""}`}>

        
        <p className="mb-3 text-sm text-neutral-400">
          Record practice, plinking, or function-check rounds. Adds to this firearm&apos;s shot count and cleaning counter,
          and joins the range session for that date and location.
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
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            Ammo Used
            <AmmoPickField
              options={ammoOptions}
              caliber={firearm.caliber}
              defaultValue={defaultPickFor(ammoOptions, firearm.caliber, lastPicks(db)[id])}
              className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Range / Location
            <SuggestInput name="range_location" listId="rf-locations" options={rangeLocations} defaultValue={settings.defaultRangeLocation || undefined} placeholder="Optional" />
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
            <span>
              Deduct from ammo on hand <HelpTip text="Also subtract these rounds from Ammo On Hand for this caliber. Uncheck for rounds you did not buy, like range rental ammo." />
            </span>
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
                  {r.session_id ? (
                    <Link href={`/range-log/session/${r.session_id}`} className="text-brand-amber hover:text-brand-amber-light">
                      {fd(r.date)}
                    </Link>
                  ) : (
                    fd(r.date)
                  )}{" "}
                  · {r.rounds} rds
                  {r.caliber
                    ? ` · ${pickLabel({ caliber: r.caliber, ammo_type: r.ammo_type, grain: r.ammo_grain, manufacturer: r.ammo_manufacturer })}`
                    : ""}
                  {r.range_location ? ` · ${r.range_location}` : ""}
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
        {adjustments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 sm:max-w-4xl">
            <div className="text-xs text-neutral-500">Count corrections</div>
            {adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border border-dashed border-neutral-700 px-3 py-1.5 text-sm">
                <span>
                  {fd(a.date)} · set to {a.set_to?.toLocaleString() ?? "?"} ({a.delta >= 0 ? "+" : ""}
                  {a.delta.toLocaleString()})
                  {a.note ? <span className="text-neutral-500"> · {a.note}</span> : null}
                </span>
                <form action={removeAdjustment.bind(null, a.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remove this correction? The shot count goes ${a.delta >= 0 ? "down" : "up"} by ${Math.abs(a.delta)}.`}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
            </Collapsible>

      <Collapsible id="range-sessions" scope="firearm" title="Range Sessions" defaultOpen={open("range-sessions", false)}
        summary={`${count(sessions.length, "session")} · ${count(logs.length, "course run")}${lastOf(sessions[0]?.date)}`}>
        <div className="flex flex-col gap-2">
          {sessions.map((sn) => {
            const runs = logs.filter((l) => l.session_id === sn.id);
            return (
              <Link
                key={sn.id}
                href={`/range-log/session/${sn.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm hover:border-neutral-600"
              >
                <span>
                  <span className="text-brand-amber">{sessionNo(sn.number)}</span> · {fd(sn.date)}
                  {sn.location ? ` · ${sn.location}` : ""} · {sn.rounds.toLocaleString()} rds
                </span>
                <span className="text-neutral-400">
                  {runs.map((l) => `${l.cof_name ?? "Course"} ${l.final_score_percent != null ? `${l.final_score_percent}%` : ""}`).join(" · ")}
                </span>
              </Link>
            );
          })}
          {sessions.length === 0 && <p className="text-sm text-neutral-500">No range sessions with this firearm yet.</p>}
        </div>
      </Collapsible>

      <Collapsible id="part-counters" scope="firearm" title="Part Counters" defaultOpen={open("part-counters", counters.length > 0)}
        summary={counters.length ? counters.map((c) => `${c.name} ${Math.max(0, firearm.shots_fired - c.start_shots).toLocaleString()}`).join(" · ") : "None"}>

        
        <p className="mb-3 text-sm text-neutral-400">
          Track rounds on a barrel, recoil spring, or other part separately from the lifetime total. When you replace the
          part, click Replaced: the counter starts over and the swap is added to the maintenance log.
        </p>
        {counters.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 sm:max-w-4xl">
            {counters.map((c) => {
              const since = Math.max(0, firearm.shots_fired - c.start_shots);
              const pct = c.interval_rounds ? Math.min(100, Math.round((since / c.interval_rounds) * 100)) : null;
              const due = c.interval_rounds != null && since >= c.interval_rounds;
              return (
                <div key={c.id} className={`border bg-neutral-900 px-3 py-2 text-sm ${due ? "border-red-900" : "border-neutral-800"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="text-brand-amber">{c.name}</span> · {since.toLocaleString()} rounds since {fd(c.start_date)}
                      {c.interval_rounds ? (
                        <span className={due ? " text-red-300" : " text-neutral-500"}>
                          {" "}
                          · replace at {c.interval_rounds.toLocaleString()}
                          {due ? " · DUE" : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex gap-2">
                      <form action={replaceCounter.bind(null, id, c.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Record a replacement of the ${c.name} today? Its counter starts over at 0 (the ${since} rounds are noted in the maintenance log).`}
                          className="border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
                        >
                          Replaced
                        </ConfirmSubmitButton>
                      </form>
                      <form action={removeCounter.bind(null, id, c.id)}>
                        <ConfirmSubmitButton confirmMessage={`Delete the ${c.name} counter?`} className="text-xs text-red-400 hover:text-red-300">
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </span>
                  </div>
                  {pct != null && (
                    <div className="mt-1 h-1 w-full bg-neutral-800">
                      <div className={`h-1 ${due ? "bg-red-500" : "bg-brand-amber"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <details className="group sm:max-w-4xl">
          <summary className="inline-block cursor-pointer list-none border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ Add Part Counter</span>
            <span className="hidden group-open:inline">Cancel</span>
          </summary>
          <form action={createCounter.bind(null, id)} className="mt-2 grid grid-cols-1 gap-2 border border-neutral-800 bg-neutral-900/50 p-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              Part
              <input name="name" required list="counter-parts" placeholder="e.g. Barrel" className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Installed / Since
              <input type="date" name="start_date" defaultValue={todayISO()} className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Rounds on it already
              <input type="number" name="rounds_since" min={0} defaultValue={0} className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span>
                Replace every (rounds) <HelpTip text="Optional. The counter turns red and shows in the Heads Up bar when the part reaches this many rounds." />
              </span>
              <input type="number" name="interval_rounds" min={1} placeholder="Optional" className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
            </label>
            <datalist id="counter-parts">
              {["Barrel", "Recoil Spring", "Extractor", "Firing Pin", "Bolt", "Buffer Spring", "Gas Rings", "Magazine Springs", "Suppressor Wipes"].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <SubmitButton className="w-fit bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light sm:col-span-4">Add Counter</SubmitButton>
          </form>
        </details>
            </Collapsible>

      <Collapsible id="accessories" scope="firearm" title="Accessories" defaultOpen={open("accessories", false)}
        summary={count(accessories.length, "linked", "linked")}>

        
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
            </Collapsible>

      <Collapsible id="photos" scope="firearm" title="Photos" defaultOpen={open("photos", false)} summary={count(photos.length, "photo")}>
        <AttachmentGallery
          items={photos}
          ownerType="firearm"
          ownerId={id}
          kind="photo"
          imagesOnly
          emptyText="No photos yet. Photos of each side and the serial number help with insurance claims."
        />
      </Collapsible>

      <Collapsible id="receipts" scope="firearm" title="Receipts & Documents" defaultOpen={open("receipts", false)} summary={count(receipts.length, "file")}>
        <AttachmentGallery
          items={receipts}
          ownerType="firearm"
          ownerId={id}
          kind="receipt"
          emptyText="No receipts uploaded yet."
        />
      </Collapsible>

      <Collapsible id="maintenance" scope="firearm" title="Maintenance / Cleaning" defaultOpen={open("maintenance", false)}
        summary={`${count(maintenanceLog.length, "entry", "entries")}${lastOf(maintenanceLog[0]?.date)}`}>

        
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
            </Collapsible>

      <Collapsible id="malfunctions" scope="firearm" title="Malfunction History" defaultOpen={open("malfunctions", false)}
        summary={`${count(malfunctionLog.length, "entry", "entries")}${lastOf(malfunctionLog[0]?.date)}`}>

        
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
            </Collapsible>

      <Collapsible id="zero" scope="firearm" title="Zero Log" defaultOpen={open("zero", false)}
        summary={`${count(zeroRecords.length, "entry", "entries")}${lastOf(zeroRecords[0]?.date)}`}>

        
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
            </Collapsible>

      <Collapsible id="disposition" scope="firearm" title="Sale / Transfer Record" defaultOpen={open("disposition", dispositions.length > 0 || firearm.status === "sold")}
        summary={dispositions.length ? `${dispositions[0].type} ${fd(dispositions[0].date)}` : "None"}>

        
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
            </Collapsible>
    </div>
  );
}
