"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { backupNow, clearBackupPassword, saveAutoBackupSettings, setBackupPassword } from "@/app/settings/actions";

type Res = { ok: boolean; error?: string; message?: string };

declare global {
  interface Window {
    taclog?: { chooseFolder: () => Promise<string | null> };
  }
}

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case";
const btn = "border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-60";

export default function BackupSettings({
  hasPassword,
  encrypted,
  frequency,
  folder,
  keep,
  lastRun,
  lastFile,
  lastError,
}: {
  hasPassword: boolean;
  encrypted: boolean;
  frequency: string;
  folder: string;
  keep: number;
  lastRun: string | null;
  lastFile: string | null;
  lastError: string | null;
}) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [freq, setFreq] = useState(frequency);
  const [dir, setDir] = useState(folder);
  const [keepN, setKeepN] = useState(keep);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<Res>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "Something went wrong." });
      if (res.ok) {
        setPw("");
        setPw2("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/export" className={btn}>
            Download Full Backup
          </a>
          <span className="text-xs text-neutral-500">
            {hasPassword ? "Encrypted with your backup password (.tlbak)." : "Plain .zip. Set a backup password below to encrypt it."}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border border-neutral-800 p-3">
        <h3 className="text-sm text-neutral-200">Backup Password {hasPassword && <span className="text-green-400">· set</span>}</h3>
        <p className="text-xs text-neutral-500">
          Encrypts every backup (manual and automatic) so a lost USB drive or cloud account doesn&apos;t expose your
          inventory. You&apos;ll need this password to restore. It is separate from your unlock password.
          {encrypted && " Required while database encryption is on."}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PasswordInput placeholder={hasPassword ? "New backup password" : "Backup password (8+)"} value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
          <PasswordInput placeholder="Confirm" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
          <div className="flex gap-2">
            <button type="button" disabled={pending} className={btn} onClick={() => run(() => setBackupPassword(pw, pw2))}>
              {hasPassword ? "Change" : "Set"}
            </button>
            {hasPassword && !encrypted && (
              <button
                type="button"
                disabled={pending}
                className={btn}
                onClick={() => {
                  if (window.confirm("Remove the backup password? New backups will not be encrypted.")) run(() => clearBackupPassword());
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border border-neutral-800 p-3">
        <h3 className="text-sm text-neutral-200">Automatic Backups</h3>
        <p className="text-xs text-neutral-500">
          TAC-LOG writes a full backup to the folder you pick (a USB drive, or a synced folder like OneDrive, iCloud Drive,
          or Dropbox) and keeps the most recent copies. If a backup was missed while the app was closed, it runs the next
          time TAC-LOG opens.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_7rem]">
          <label className="flex flex-col gap-1 text-sm">
            Frequency
            <select value={freq} onChange={(e) => setFreq(e.target.value)} className={input}>
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Folder
            <div className="flex gap-2">
              <input value={dir} onChange={(e) => setDir(e.target.value)} placeholder="Choose a folder" className={`${input} flex-1`} />
              <button
                type="button"
                className={btn}
                onClick={async () => {
                  const picked = await window.taclog?.chooseFolder();
                  if (picked) setDir(picked);
                }}
              >
                Browse…
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Keep last
            <input type="number" min={1} max={100} value={keepN} onChange={(e) => setKeepN(Number(e.target.value))} className={input} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} className="bg-brand-olive px-4 py-2 text-sm hover:bg-brand-olive-light disabled:opacity-60" onClick={() => run(() => saveAutoBackupSettings(freq, dir, keepN))}>
            Save
          </button>
          {folder && (
            <button type="button" disabled={pending} className={btn} onClick={() => run(() => backupNow())}>
              {pending ? "Working…" : "Back up now"}
            </button>
          )}
        </div>
        <div className="text-xs text-neutral-400">
          {lastRun ? (
            <>
              Last automatic backup: {lastRun} <span className="break-all text-neutral-500">({lastFile})</span>
            </>
          ) : (
            "No automatic backup yet."
          )}
        </div>
        {lastError && <p className="text-sm text-red-400">Last backup failed: {lastError}</p>}
      </div>
      {msg && <p className={`break-all text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
