import fs from "fs";
import path from "path";
import { dataDir, getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ImportCofForm from "@/components/ImportCofForm";
import RestoreForm from "@/components/RestoreForm";
import { saveSettingsForm } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import Collapsible from "@/components/Collapsible";
import SectionTools from "@/components/SectionTools";
import BulkCounts from "@/components/BulkCounts";
import { ammoStatus } from "@/lib/ammo";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import Link from "next/link";
import { fdt } from "@/lib/display";
import SecuritySettings from "@/components/SecuritySettings";
import BackupSettings from "@/components/BackupSettings";
import SpreadsheetImport from "@/components/SpreadsheetImport";
import { securityMode, isEncrypted } from "@/lib/security-state";
import { savedBackupKey } from "@/lib/backup";
import { getAutoBackup, getAutoBackupStatus } from "@/lib/auto-backup";
import { DATE_FORMATS, FIREARM_LABEL_MODES } from "@/lib/settings";

export const dynamic = "force-dynamic";

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case";
const btn = "inline-block border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700";

function fileSize(p: string) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const db = getDb();
  const s = getSettings(db);
  const dir = dataDir();
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const formOpen = Boolean(saved);
  const auto = getAutoBackup(db);
  const autoStatus = getAutoBackupStatus(db);
  const dbBytes =
    fileSize(path.join(dir, "firearms.db")) + fileSize(path.join(dir, "firearms.db-wal"));

  return (
    <div data-scope="settings" className="flex max-w-5xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-400">Security, backups, imports, and app-wide defaults. Click a section to open it.</p>
      </div>
      <SectionTools scope="settings" search />

      <Collapsible id="settings-security" title="Security" keywords="pin password lock encryption recovery key auto-lock idle" defaultOpen={false}>
        <SecuritySettings mode={securityMode()} autoLockMinutes={s.autoLockMinutes} />
      </Collapsible>

      <Collapsible id="settings-backup" title="Backup" keywords="backup password automatic folder download restore tlbak zip" defaultOpen={false}>
        <p className="mb-3 text-sm text-neutral-400">
          A full backup is one file with your entire database and every photo and receipt. Everything lives on this
          computer only, with no cloud copy, so keep backups somewhere safe.
        </p>
        <BackupSettings
          hasPassword={Boolean(savedBackupKey(db))}
          encrypted={isEncrypted()}
          frequency={auto.frequency}
          folder={auto.folder}
          keep={auto.keep}
          lastRun={autoStatus.lastRun ? fdt(autoStatus.lastRun) : null}
          lastFile={autoStatus.lastFile}
          lastError={autoStatus.lastError}
        />
      </Collapsible>

      <Collapsible id="settings-restore" title="Restore" keywords="restore backup move new computer" defaultOpen={false}>
        <p className="mb-3 text-sm text-neutral-400">
          Replace this computer&apos;s data with a TAC-LOG backup (.tlbak or .zip), or with an older database-only
          backup (.db). Also how you move TAC-LOG to a new computer. Older backups are upgraded automatically.
        </p>
        <RestoreForm />
      </Collapsible>

      <Collapsible id="settings-courses-of-fire" title="Courses of Fire" keywords="import export course json categories" defaultOpen={false}>
        <p className="mb-3 text-sm text-neutral-400">
          Import course files (.json), one or several at once. You review each course and pick its categories before anything is saved. Courses with a matching code are updated. Only Course of Fire and
          Target Type data is touched. To share one course, use Export on that course&apos;s page.
        </p>
        <ImportCofForm />
        <a href="/api/courses/export" className={`${btn} mt-3`}>
          Export All Courses
        </a>
      </Collapsible>

      <Collapsible id="settings-spreadsheets" title="Spreadsheets" keywords="import excel xlsx csv export spreadsheet inventory" defaultOpen={false}>
        <p className="mb-3 text-sm text-neutral-400">
          Import firearms, serialized accessories, ammo purchases, and ammo goals from an Excel workbook (.xlsx) or
          CSV, such as your original FIREARMS INVENTORY sheet. TAC-LOG finds each table by its header row, shows a
          preview first, and skips anything already here (matched by serial number).
        </p>
        <SpreadsheetImport />
        <div className="mt-4 text-sm text-neutral-400">Export to CSV (opens in Excel):</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["firearms", "Firearms"],
            ["accessories", "Accessories"],
            ["ammo", "Ammo Purchases"],
            ["range-sessions", "Range Sessions"],
            ["rounds-fired", "Rounds Fired Log"],
            ["maintenance", "Maintenance Log"],
          ].map(([type, label]) => (
            <a key={type} href={`/api/csv?type=${type}`} className={btn}>
              {label}
            </a>
          ))}
        </div>
      </Collapsible>

      <Collapsible id="settings-counts" title="Counts" keywords="reset rounds fired shot count ammo on hand correct zero">
        <p className="mb-3 text-sm text-neutral-400">
          Correct rounds fired or ammo on hand for several items at once. To correct a single item, use Correct count on
          that firearm&apos;s page or on the Ammo page.
        </p>
        <BulkCounts
          firearms={(db.prepare(`select id, shots_fired, firearm_label(make_model, nickname) as label from firearms where status != 'sold' order by make_model`).all() as { id: string; shots_fired: number; label: string }[]).map((f) => ({ key: f.id, label: f.label, current: f.shots_fired }))}
          calibers={ammoStatus(db, s.lowAmmoPercent).map((a) => ({ key: a.caliber, label: a.caliber, current: a.on_hand }))}
        />
      </Collapsible>

      <form action={saveSettingsForm} className="flex flex-col gap-3">
        {saved && <p className="text-sm text-green-400">Settings saved.</p>}

        <Collapsible id="settings-range-session-defaults" title="Range Session Defaults" keywords="shooter grader range location defaults grader date" defaultOpen={formOpen}>
          <p className="mb-3 text-sm text-neutral-400">Pre-filled on the Log a Range Session form. You can still change them each time.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Shooter Name
              <input name="defaultShooterName" defaultValue={s.defaultShooterName} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Grader Name
              <input name="defaultGraderName" defaultValue={s.defaultGraderName} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Range Location
              <input name="defaultRangeLocation" defaultValue={s.defaultRangeLocation} className={input} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm normal-case">
            <input type="checkbox" name="graderDateFromSession" defaultChecked={s.graderDateFromSession} />
            Grader Date fills in with the session date (you can still change it)
          </label>
          <SubmitButton pendingLabel="Saving…" className="mt-4 w-fit bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Save Settings
          </SubmitButton>
        </Collapsible>

        <Collapsible id="settings-maintenance" title="Maintenance" keywords="cleaning interval rounds days due soon" defaultOpen={formOpen}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              New firearms: clean every (rounds)
              <input
                type="number"
                min={1}
                name="defaultCleanIntervalRounds"
                defaultValue={s.defaultCleanIntervalRounds ?? ""}
                placeholder="None"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              New firearms: clean every (days)
              <input
                type="number"
                min={1}
                name="defaultCleanIntervalDays"
                defaultValue={s.defaultCleanIntervalDays ?? ""}
                placeholder="None"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              &quot;Due soon&quot; at (% of interval)
              <input
                type="number"
                min={1}
                max={99}
                name="dueSoonPercent"
                defaultValue={s.dueSoonPercent}
                className={input}
              />
            </label>
          </div>
          <SubmitButton pendingLabel="Saving…" className="mt-4 w-fit bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Save Settings
          </SubmitButton>
        </Collapsible>

        <Collapsible id="settings-ammo" title="Ammo" keywords="low ammo threshold deduct manufacturer type default" defaultOpen={formOpen}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm normal-case">
              <input
                type="checkbox"
                name="deductManualRoundsByDefault"
                defaultChecked={s.deductManualRoundsByDefault}
              />
              Update Rounds Fired deducts from ammo on hand by default
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Flag ammo as low below (% of goal)
              <input
                type="number"
                min={1}
                max={100}
                name="lowAmmoPercent"
                defaultValue={s.lowAmmoPercent}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Default Manufacturer (Log Ammo Purchase)
              <input name="defaultAmmoManufacturer" list="settings-ammo-mfr" defaultValue={s.defaultAmmoManufacturer} placeholder="None" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Default Ammo Type (Log Ammo Purchase)
              <input name="defaultAmmoType" list="settings-ammo-type" defaultValue={s.defaultAmmoType} placeholder="None" className={input} />
            </label>
            <datalist id="settings-ammo-mfr">
              {getDropdownOptions(db, "ammo_manufacturer").map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <datalist id="settings-ammo-type">
              {getDropdownOptions(db, "ammo_type").map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <SubmitButton pendingLabel="Saving…" className="mt-4 w-fit bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Save Settings
          </SubmitButton>
        </Collapsible>

        <Collapsible id="settings-display" title="Display" keywords="nickname make model date format currency symbol" defaultOpen={formOpen}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Show Firearms As
              <select name="firearmLabel" defaultValue={s.firearmLabel} className={input}>
                {Object.entries(FIREARM_LABEL_MODES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Date Format
              <select name="dateFormat" defaultValue={s.dateFormat} className={input}>
                {Object.entries(DATE_FORMATS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Currency Symbol
              <input name="currencySymbol" defaultValue={s.currencySymbol} maxLength={4} className={input} />
            </label>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            The Inventory Report for insurance always lists make, model, and serial number, whatever you pick here.
          </p>
          <SubmitButton pendingLabel="Saving…" className="mt-4 w-fit bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light">
            Save Settings
          </SubmitButton>
        </Collapsible>

      </form>

      <Collapsible
        id="settings-about"
        title="About"
        keywords="version data folder encryption changelog what's new tour help"
        aside={
          <span className="flex gap-4">
            <Link href="/?tour=1" className="text-brand-amber hover:text-brand-amber-light">
              Take the Tour
            </Link>
            <Link href="/settings/whats-new" className="text-brand-amber hover:text-brand-amber-light">
              What&apos;s New / Changelog
            </Link>
          </span>
        }
      >
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-neutral-500">Version</dt>
          <dd>TAC-LOG {process.env.TAC_LOG_VERSION ?? "(development)"}</dd>
          <dt className="text-neutral-500">Data folder</dt>
          <dd className="break-all normal-case">{dir}</dd>
          <dt className="text-neutral-500">Database size</dt>
          <dd>{(dbBytes / 1024 / 1024).toFixed(2)} MB</dd>
          <dt className="text-neutral-500">Records</dt>
          <dd>
            {count(`select count(*) as n from firearms`)} firearms ·{" "}
            {count(`select count(*) as n from courses_of_fire`)} courses ·{" "}
            {count(`select count(*) as n from range_log`)} range sessions ·{" "}
            {count(`select count(*) as n from attachments`)} photos &amp; documents
          </dd>
          <dt className="text-neutral-500">Encryption</dt>
          <dd>{isEncrypted() ? "On (SQLCipher, AES-256)" : "Off"}</dd>
        </dl>
        <p className="mt-4 text-center text-[11px] tracking-[0.25em] text-neutral-500">POWERED BY PRECISION SYSTEMS</p>
      </Collapsible>
    </div>
  );
}
