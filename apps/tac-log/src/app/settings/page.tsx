import PageHeader from "@core/components/PageHeader";
import UpdateSettings from "@core/components/UpdateSettings";
import fs from "fs";
import path from "path";
import { dataDir, getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ImportCofForm from "@/components/ImportCofForm";
import RestoreForm from "@/components/RestoreForm";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import { DisplayForm, HeadsUpForm } from "@/components/SettingsForms";
import Link from "next/link";
import { fdt } from "@/lib/display";
import SecuritySettings from "@/components/SecuritySettings";
import BackupSettings from "@/components/BackupSettings";
import SpreadsheetImport from "@/components/SpreadsheetImport";
import { securityMode, isEncrypted } from "@/lib/security-state";
import { savedBackupKey } from "@/lib/backup";
import { getAutoBackup, getAutoBackupStatus } from "@/lib/auto-backup";

export const dynamic = "force-dynamic";

const btn = "btn btn-secondary";

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
  const auto = getAutoBackup(db);
  const autoStatus = getAutoBackupStatus(db);
  const dbBytes =
    fileSize(path.join(dir, "firearms.db")) + fileSize(path.join(dir, "firearms.db-wal"));

  return (
    <div data-scope="settings" className="flex max-w-5xl flex-col gap-3">
      <PageHeader title="Settings" icon="settings" subtitle="Security, backups, import/export, display, and updates. Click a section to open it." />
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

      <Collapsible
        id="settings-import-export"
        title="Import / Export"
        keywords="import export course json categories excel xlsx csv spreadsheet inventory files"
      >
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-1 text-sm text-brand-amber">Import</h3>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs text-neutral-300">Courses of Fire (.json)</h4>
                <p className="mb-2 text-xs text-neutral-500">
                  One or several course files at once. You review each course and pick its categories before anything is
                  saved. Courses with a matching code are updated.
                </p>
                <ImportCofForm />
              </div>
              <div>
                <h4 className="mb-1 text-xs text-neutral-300">Spreadsheet (.xlsx or .csv)</h4>
                <p className="mb-2 text-xs text-neutral-500">
                  Firearms, serialized accessories, ammo purchases, and ammo goals, such as your original FIREARMS
                  INVENTORY sheet. You get a preview first, and anything already here (matched by serial number) is skipped.
                </p>
                <SpreadsheetImport />
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-1 text-sm text-brand-amber">Export</h3>
            <p className="mb-2 text-xs text-neutral-500">
              CSV files open in Excel or Google Sheets. Course files can be imported into another copy of TAC-LOG. To share a
              single course, use Export on that course&apos;s page.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/api/courses/export" className={btn}>
                All Courses of Fire (.json)
              </a>
              {[
                ["firearms", "Firearms"],
                ["accessories", "Accessories"],
                ["ammo", "Ammo Purchases"],
                ["range-sessions", "Range Sessions"],
                ["rounds-fired", "Rounds Fired Log"],
                ["maintenance", "Maintenance Log"],
                ["documents", "Permits & Documents"],
              ].map(([type, label]) => (
                <a key={type} href={`/api/csv?type=${type}`} className={btn}>
                  {label} (.csv)
                </a>
              ))}
            </div>
          </div>
        </div>
      </Collapsible>

      <Collapsible id="settings-display" title="Display" keywords="nickname make model date format currency symbol theme light dark text size larger font" defaultOpen={saved === "display"}>
        <DisplayForm s={s} saved={saved === "display"} returnTo="/settings" />
      </Collapsible>

      <Collapsible id="settings-heads-up" title="Heads Up Bar" keywords="launch reminders heads up startup notice" defaultOpen={saved === "headsup"}>
        <HeadsUpForm s={s} saved={saved === "headsup"} returnTo="/settings" />
      </Collapsible>

      <Collapsible id="settings-updates" title="Updates" keywords="update upgrade new version download check github release">
        <UpdateSettings releasesUrl="https://github.com/TACSystems/TAC-LOG-Releases/releases" />
      </Collapsible>

      <Collapsible
        id="settings-about"
        title="About"
        keywords="version data folder encryption changelog what's new tour help"
        aside={
          <span className="flex gap-4">
            <Link href="/help" className="text-brand-amber hover:text-brand-amber-light">
              Help
            </Link>
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
