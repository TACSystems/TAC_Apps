import fs from "fs";
import path from "path";
import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import UpdateSettings from "@core/components/UpdateSettings";
import { dataDir, getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fdt } from "@/lib/display";
import { securityMode, isEncrypted } from "@/lib/security-state";
import { savedBackupKey } from "@/lib/backup";
import { getAutoBackup, getAutoBackupStatus } from "@/lib/auto-backup";
import SecuritySettings from "@/components/SecuritySettings";
import BackupSettings from "@/components/BackupSettings";
import RestoreForm from "@/components/RestoreForm";
import { ClassDefaultsForm, DisplayForm } from "@/components/SettingsForms";

export const dynamic = "force-dynamic";

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
  const dbBytes = fileSize(path.join(dir, "tacqual.db")) + fileSize(path.join(dir, "tacqual.db-wal"));

  return (
    <div data-scope="settings" className="flex max-w-5xl flex-col gap-3">
      <PageHeader
        title="Settings"
        icon="settings"
        subtitle="Security, backups, class defaults, display and updates. Click a section to open it."
      />
      <SectionTools scope="settings" search />

      <Collapsible
        id="settings-security"
        title="Security"
        keywords="pin password lock encryption recovery key auto-lock idle"
        defaultOpen={false}
      >
        <SecuritySettings mode={securityMode()} autoLockMinutes={s.autoLockMinutes} />
      </Collapsible>

      <Collapsible
        id="settings-backup"
        title="Backup"
        keywords="backup password automatic folder download restore tqbak zip"
        defaultOpen={false}
      >
        <p className="mb-3 text-sm text-neutral-400">
          A full backup is one file holding every student, class, score and course of fire. Everything lives on this
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
          Replace this computer&apos;s data with a TAC-QUAL backup (.tqbak or .zip), or with a database-only backup
          (.db). Also how you move TAC-QUAL to a new computer.
        </p>
        <RestoreForm />
      </Collapsible>

      <Collapsible
        id="settings-classes"
        title="Class Defaults"
        keywords="instructor name location relay size default"
        defaultOpen={saved === "classes"}
      >
        <ClassDefaultsForm s={s} saved={saved === "classes"} returnTo="/settings" />
      </Collapsible>

      <Collapsible
        id="settings-display"
        title="Display"
        keywords="date format theme light dark text size larger font"
        defaultOpen={saved === "display"}
      >
        <DisplayForm s={s} saved={saved === "display"} returnTo="/settings" />
      </Collapsible>

      <Collapsible id="settings-updates" title="Updates" keywords="update upgrade new version download check github release">
        <UpdateSettings releasesUrl="https://github.com/TACSystems/TAC-QUAL-Releases/releases" />
      </Collapsible>

      <Collapsible id="settings-about" title="About" keywords="version data folder encryption">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-neutral-500">Version</dt>
          <dd>TAC-QUAL {process.env.TAC_LOG_VERSION ?? "(development)"}</dd>
          <dt className="text-neutral-500">Data folder</dt>
          <dd className="break-all normal-case">{dir}</dd>
          <dt className="text-neutral-500">Database size</dt>
          <dd>{(dbBytes / 1024 / 1024).toFixed(2)} MB</dd>
          <dt className="text-neutral-500">Records</dt>
          <dd>
            {count(`select count(*) as n from students`)} students ·{" "}
            {count(`select count(*) as n from classes`)} classes ·{" "}
            {count(`select count(*) as n from score_runs`)} scored runs ·{" "}
            {count(`select count(*) as n from courses_of_fire`)} courses
          </dd>
          <dt className="text-neutral-500">Encryption</dt>
          <dd>{isEncrypted() ? "On (SQLCipher, AES-256)" : "Off"}</dd>
        </dl>
        <p className="mt-4 text-center text-[11px] tracking-[0.25em] text-neutral-500">POWERED BY TAC SYSTEMS</p>
      </Collapsible>
    </div>
  );
}
