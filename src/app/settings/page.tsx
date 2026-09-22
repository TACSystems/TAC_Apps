import fs from "fs";
import path from "path";
import { dataDir, getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ImportCofForm from "@/components/ImportCofForm";
import RestoreForm from "@/components/RestoreForm";
import { saveSettingsForm } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const card = "border border-neutral-800 bg-neutral-900 p-4";
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
  const dbBytes =
    fileSize(path.join(dir, "firearms.db")) + fileSize(path.join(dir, "firearms.db-wal"));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-400">Backups, course imports, and app-wide defaults.</p>
      </div>

      <section className={card}>
        <h2 className="mb-1 font-medium text-neutral-200">Backup</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Downloads one .zip with your entire database and every receipt image. Everything lives on this
          computer only, with no cloud copy, so keep backups somewhere safe (a USB drive or your own cloud storage).
        </p>
        <a href="/api/export" className={btn}>
          Download Full Backup
        </a>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-medium text-neutral-200">Restore</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Replace this computer&apos;s data with a TAC-LOG backup (.zip), or with an older database-only backup
          (.db). Also how you move TAC-LOG to a new computer. Older backups are upgraded automatically.
        </p>
        <RestoreForm />
      </section>

      <section className={card}>
        <h2 className="mb-1 font-medium text-neutral-200">Courses of Fire</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Import a course file (.json) to add courses or update ones with the same code. Only Course of Fire and
          Target Type data is touched. To share one course, use Export on that course&apos;s page.
        </p>
        <ImportCofForm />
        <a href="/api/courses/export" className={`${btn} mt-3`}>
          Export All Courses
        </a>
      </section>

      <form action={saveSettingsForm} className="flex flex-col gap-6">
        {saved && <p className="text-sm text-green-400">Settings saved.</p>}

        <section className={card}>
          <h2 className="mb-3 font-medium text-neutral-200">Range Session Defaults</h2>
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
        </section>

        <section className={card}>
          <h2 className="mb-3 font-medium text-neutral-200">Maintenance</h2>
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
        </section>

        <section className={card}>
          <h2 className="mb-3 font-medium text-neutral-200">Ammo</h2>
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
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 font-medium text-neutral-200">Display</h2>
          <label className="flex w-40 flex-col gap-1 text-sm">
            Currency Symbol
            <input name="currencySymbol" defaultValue={s.currencySymbol} maxLength={4} className={input} />
          </label>
        </section>

        <SubmitButton
          pendingLabel="Saving…"
          className="w-fit bg-blue-600 px-5 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Save Settings
        </SubmitButton>
      </form>

      <section className={card}>
        <h2 className="mb-2 font-medium text-neutral-200">About</h2>
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
            {count(`select count(*) as n from receipt_images`)} receipts
          </dd>
        </dl>
      </section>
    </div>
  );
}
