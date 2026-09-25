import DispositionSection from "@/components/firearm/DispositionSection";
import ZeroSection from "@/components/firearm/ZeroSection";
import MalfunctionsSection from "@/components/firearm/MalfunctionsSection";
import MaintenanceSection from "@/components/firearm/MaintenanceSection";
import AccessoriesSection from "@/components/firearm/AccessoriesSection";
import PartCountersSection from "@/components/firearm/PartCountersSection";
import SessionsSection from "@/components/firearm/SessionsSection";
import RoundsFiredSection from "@/components/firearm/RoundsFiredSection";
import { getDb } from "@/lib/db";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { updateFirearm, deleteFirearm } from "@/app/inventory/actions";
import {
  logMaintenance,
  logMalfunction,
  logZeroRecord,
  } from "./log-actions";
import { listAttachments } from "@/lib/attachments";
import AttachmentGallery from "@/components/AttachmentGallery";
import {
  type Disposition,
} from "@/components/FirearmLogEntries";

export const dynamic = "force-dynamic";
import FirearmForm from "@/components/FirearmForm";
import { maintenanceInfo } from "@/lib/maintenance";
import { getSettings, money } from "@/lib/settings";
import { getMaintenanceTypes } from "@/lib/db/dropdown-options";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
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
import CountCorrector from "@core/components/CountCorrector";
import { firearmAdjustments, listCounters } from "@/lib/counts";
import { correctFirearm } from "@/app/counts/actions";
import Icon from "@core/components/Icon";
import StatusBadge from "@core/components/StatusBadge";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import { pageSections } from "@core/lib/page-sections";
import { pickOptions } from "@/lib/ammo";

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
      <Link href="/inventory" className="inline-flex items-center gap-1 text-xs text-brand-amber hover:text-brand-amber-light">
        <Icon name="back" size={12} /> Armory
      </Link>
      <section data-firearm-header className="card flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex shrink-0 items-center justify-center border border-neutral-800 bg-neutral-950 lg:w-56" style={{ minHeight: "9rem" }}>
          {photos[0] ? (
            <a href="#photos" title="See all photos" className="block h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/receipts/${photos[0].file_path}`} alt={label(firearm)} className="h-full max-h-56 w-full object-cover" />
            </a>
          ) : (
            <a href="#photos" className="flex flex-col items-center gap-1 p-4 text-center text-xs text-neutral-500 hover:text-neutral-300">
              <Icon name="upload" size={22} />
              Add a photo
            </a>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-3 text-xl font-semibold">
                <span className="break-words">{label(firearm)}</span>
                <StatusBadge status={firearm.status} />
              </h1>
              <p className="text-sm text-neutral-400">
                {[firearm.nickname && label(firearm) === firearm.nickname ? firearm.make_model : null, firearm.caliber, firearm.platform, firearm.serial_number ? `SN ${firearm.serial_number}` : null]
                  .filter(Boolean)
                  .join(" · ") || "No details yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#rounds-fired" className="btn btn-primary btn-sm">
                <Icon name="plus" size={14} /> Record Rounds
              </a>
              <a href="#maintenance" className="btn btn-secondary btn-sm">
                <Icon name="wrench" size={14} /> Log Cleaning
              </a>
              <Link href={`/inventory/new?from=${firearm.id}`} className="btn btn-secondary btn-sm">
                Add Another Like This
              </Link>
              <form action={deleteWithId}>
                <ConfirmSubmitButton
                  confirmMessage={`Delete ${label(firearm)}? This also removes its photos, receipts, sale records, maintenance, malfunction, and zero log entries. Its accessories and range log history stay on file but will no longer show a linked firearm. This cannot be undone.`}
                  className="btn btn-danger btn-sm"
                >
                  <Icon name="trash" size={14} /> Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-3 sm:grid-cols-4">
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
              <div className="text-xs text-neutral-500">Cleaning</div>
              <div className={`text-lg ${upkeep.status === "due" ? "text-red-400" : upkeep.status === "soon" ? "text-amber-400" : ""}`}>
                {upkeep.status === "unset"
                  ? "—"
                  : upkeep.status === "due"
                    ? "Due"
                    : firearm.clean_interval_rounds
                      ? `${upkeep.roundsSince}/${firearm.clean_interval_rounds}`
                      : `by ${fd(upkeep.nextDueDate)}`}
              </div>
              {lastCleaning && <div className="text-xs text-neutral-500">last {fd(lastCleaning)}</div>}
            </div>
            <div>
              <div className="text-xs text-neutral-500">Malfunctions</div>
              <div className="text-lg">{firearm.malfunctions + malfunctionLog.length}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Total Investment</div>
              <div className="text-lg">{money(totalInvestment, settings.currencySymbol)}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="sm:max-w-4xl">
        <SectionTools scope="firearm" remember />
      </div>

      <Collapsible id="details" icon="armory" scope="firearm" title="Firearm Details" defaultOpen={open("details", false)}
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

      <Collapsible id="rounds-fired" icon="ammo" scope="firearm" title="Update Rounds Fired" defaultOpen={open("rounds-fired", true)}
        summary={`${firearm.shots_fired.toLocaleString()} lifetime${roundsLog[0] ? lastOf(roundsLog[0].date) : ""}`}>
        <RoundsFiredSection id={id} firearm={firearm} roundsLog={roundsLog} adjustments={adjustments} settings={settings} ammoOptions={ammoOptions} rangeLocations={rangeLocations} db={db} />
</Collapsible>

      <Collapsible id="range-sessions" icon="range" scope="firearm" title="Range Sessions" defaultOpen={open("range-sessions", false)}
        summary={`${count(sessions.length, "session")} · ${count(logs.length, "course run")}${lastOf(sessions[0]?.date)}`}>
        <SessionsSection sessions={sessions} logs={logs} />
</Collapsible>

      <Collapsible id="part-counters" icon="wrench" scope="firearm" title="Part Counters" defaultOpen={open("part-counters", counters.length > 0)}
        summary={counters.length ? counters.map((c) => `${c.name} ${Math.max(0, firearm.shots_fired - c.start_shots).toLocaleString()}`).join(" · ") : "None"}>
        <PartCountersSection id={id} firearm={firearm} counters={counters} />
</Collapsible>

      <Collapsible id="accessories" icon="target" scope="firearm" title="Accessories" defaultOpen={open("accessories", false)}
        summary={count(accessories.length, "linked", "linked")}>
        <AccessoriesSection id={id} settings={settings} accessories={accessories} pastMounts={pastMounts} />
</Collapsible>

      <Collapsible id="photos" icon="upload" scope="firearm" title="Photos" defaultOpen={open("photos", false)} summary={count(photos.length, "photo")}>
        <AttachmentGallery
          items={photos}
          ownerType="firearm"
          ownerId={id}
          kind="photo"
          imagesOnly
          emptyText="No photos yet. Photos of each side and the serial number help with insurance claims."
        />
      </Collapsible>

      <Collapsible id="receipts" icon="documents" scope="firearm" title="Receipts & Documents" defaultOpen={open("receipts", false)} summary={count(receipts.length, "file")}>
        <AttachmentGallery
          items={receipts}
          ownerType="firearm"
          ownerId={id}
          kind="receipt"
          emptyText="No receipts uploaded yet."
        />
      </Collapsible>

      <Collapsible id="maintenance" icon="wrench" scope="firearm" title="Maintenance / Cleaning" defaultOpen={open("maintenance", false)}
        summary={`${count(maintenanceLog.length, "entry", "entries")}${lastOf(maintenanceLog[0]?.date)}`}>
        <MaintenanceSection id={id} maintenanceLog={maintenanceLog} maintenanceTypes={maintenanceTypes} maintenanceAction={maintenanceAction} />
</Collapsible>

      <Collapsible id="malfunctions" icon="warning" scope="firearm" title="Malfunction History" defaultOpen={open("malfunctions", false)}
        summary={`${count(malfunctionLog.length, "entry", "entries")}${lastOf(malfunctionLog[0]?.date)}`}>
        <MalfunctionsSection id={id} malfunctionLog={malfunctionLog} malfunctionTypes={malfunctionTypes} malfunctionAction={malfunctionAction} />
</Collapsible>

      <Collapsible id="zero" icon="target" scope="firearm" title="Zero Log" defaultOpen={open("zero", false)}
        summary={`${count(zeroRecords.length, "entry", "entries")}${lastOf(zeroRecords[0]?.date)}`}>
        <ZeroSection id={id} zeroRecords={zeroRecords} zeroDistances={zeroDistances} zeroAction={zeroAction} />
</Collapsible>

      <Collapsible id="disposition" icon="external" scope="firearm" title="Sale / Transfer Record" defaultOpen={open("disposition", dispositions.length > 0 || firearm.status === "sold")}
        summary={dispositions.length ? `${dispositions[0].type} ${fd(dispositions[0].date)}` : "None"}>
        <DispositionSection id={id} firearm={firearm} settings={settings} dispositions={dispositions} billsOfSale={billsOfSale} />
</Collapsible>
    </div>
  );
}
