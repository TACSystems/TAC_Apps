"use client";

import { useDialogs } from "@core/components/Dialogs";
import PasswordInput from "@core/components/PasswordInput";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  disableEncryption,
  enableEncryption,
  newRecoveryKey,
  removePin,
  saveAutoLock,
  savePin,
} from "@/app/lock/actions";
import type { ActionResult } from "@core/lib/forms";

type Res = ActionResult & { recoveryKey?: string };

const input = "input";
const primary = "btn btn-primary";
const danger = "border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-200 hover:bg-red-900 disabled:opacity-60";
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);

function Field({
  label,
  value,
  onChange,
  pin,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  pin?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <PasswordInput inputMode={pin ? "numeric" : undefined}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(pin ? digits(e.target.value) : e.target.value)}
        className={input}
      />
    </label>
  );
}

function RecoveryKeyCard({ recoveryKey, onDone }: { recoveryKey: string; onDone: () => void }) {
  return (
    <div className="recovery-card border-2 border-brand-amber bg-neutral-950 p-4">
      <h3 className="mb-2 text-brand-amber">Recovery Key</h3>
      <p className="mb-3 text-sm text-neutral-300">
        This is the only way back into your data if you forget your password. Print it or write it down and keep it
        somewhere safe, away from this computer. It will not be shown again.
      </p>
      <p className="mb-4 select-all break-all border border-neutral-700 bg-neutral-900 p-3 text-center text-lg tracking-wider">
        {recoveryKey}
      </p>
      <div className="no-print flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="border border-neutral-700 px-4 py-2 text-sm">
          Print
        </button>
        <button type="button" onClick={onDone} className={primary}>
          I&apos;ve saved it
        </button>
      </div>
    </div>
  );
}

export default function SecuritySettings({
  mode,
  autoLockMinutes,
}: {
  mode: "none" | "pin" | "password";
  autoLockMinutes: number;
}) {
  const router = useRouter();
  const { confirm: ask } = useDialogs();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [panel, setPanel] = useState<"pin" | "encrypt" | "password" | null>(null);
  const [pending, startTransition] = useTransition();

  function clear() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function run(fn: () => Promise<Res>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "Something went wrong." });
      if (res.recoveryKey) setRecoveryKey(res.recoveryKey);
      if (res.ok) {
        clear();
        setPanel(null);
        router.refresh();
      } else {
        setCurrent("");
      }
    });
  }

  if (recoveryKey) {
    return <RecoveryKeyCard recoveryKey={recoveryKey} onDone={() => setRecoveryKey(null)} />;
  }

  const status =
    mode === "password"
      ? "Database encryption is ON. Your data file and photos are encrypted, and TAC-LOG asks for your password every time it opens."
      : mode === "pin"
        ? "A PIN is set. TAC-LOG asks for it every time it opens. The data file itself is not encrypted."
        : "TAC-LOG opens without a PIN or password.";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-400">{status}</p>

      {mode !== "password" && (
        <div className="flex flex-col gap-3 border border-neutral-800 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-neutral-200">PIN Lock</h3>
            <button type="button" className="text-xs text-brand-amber" onClick={() => { clear(); setPanel(panel === "pin" ? null : "pin"); }}>
              {panel === "pin" ? "Cancel" : mode === "pin" ? "Change or remove PIN" : "Set a PIN"}
            </button>
          </div>
          {panel === "pin" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {mode === "pin" && <Field label="Current PIN" value={current} onChange={setCurrent} pin />}
                <Field label={mode === "pin" ? "New PIN" : "PIN (4–12 digits)"} value={next} onChange={setNext} pin />
                <Field label="Confirm PIN" value={confirm} onChange={setConfirm} pin />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => savePin(current, next, confirm))} className={primary}>
                  {mode === "pin" ? "Change PIN" : "Set PIN"}
                </button>
                {mode === "pin" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      ask("Remove the PIN? TAC-LOG will open without asking.").then((ok) => ok && run(() => removePin(current)));
                    }}
                    className={danger}
                  >
                    Remove PIN
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border border-neutral-800 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm text-neutral-200">Database Encryption</h3>
          {mode !== "password" ? (
            <button type="button" className="text-xs text-brand-amber" onClick={() => { clear(); setPanel(panel === "encrypt" ? null : "encrypt"); }}>
              {panel === "encrypt" ? "Cancel" : "Turn on encryption"}
            </button>
          ) : (
            <button type="button" className="text-xs text-brand-amber" onClick={() => { clear(); setPanel(panel === "password" ? null : "password"); }}>
              {panel === "password" ? "Cancel" : "Manage password"}
            </button>
          )}
        </div>
        {mode !== "password" && panel !== "encrypt" && (
          <p className="text-xs text-neutral-500">
            Encrypts the data file and every photo and receipt with a password (8+ characters), so they can&apos;t be
            read if this computer or drive is lost or stolen. The password replaces the PIN. You&apos;ll get a recovery key to print.
          </p>
        )}
        {panel === "encrypt" && (
          <>
            <p className="text-xs text-neutral-400">
              Before switching, TAC-LOG checks the encrypted copy and puts things back if anything goes wrong. Backups
              will require a backup password from now on. If you lose both the password and the recovery key, the data
              can&apos;t be recovered by anyone.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {mode === "pin" && <Field label="Current PIN" value={current} onChange={setCurrent} pin />}
              <Field label="New password (8+ characters)" value={next} onChange={setNext} />
              <Field label="Confirm password" value={confirm} onChange={setConfirm} />
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => enableEncryption(current, next, confirm))} className={`${primary} w-fit`}>
              {pending ? "Encrypting…" : "Encrypt my data"}
            </button>
          </>
        )}
        {panel === "password" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Current password" value={current} onChange={setCurrent} />
              <Field label="New password" value={next} onChange={setNext} />
              <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => changePassword(current, next, confirm))} className={primary}>
                Change password
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  ask("Create a new recovery key? The old one stops working.").then((ok) => ok && run(() => newRecoveryKey(current)));
                }}
                className="btn btn-secondary"
              >
                New recovery key
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  ask("Turn off encryption? Your data will be stored unencrypted on this computer.").then((ok) => ok && run(() => disableEncryption(current)));
                }}
                className={danger}
              >
                Turn off encryption
              </button>
            </div>
            <p className="text-xs text-neutral-500">Enter your current password for any of these.</p>
          </>
        )}
      </div>

      {mode !== "none" && (
        <label className="flex w-64 flex-col gap-1 text-sm">
          Auto-lock when idle
          <select
            defaultValue={autoLockMinutes}
            onChange={(e) => run(() => saveAutoLock(Number(e.target.value)).then(() => ({ ok: true, message: "Auto-lock saved." })))}
            className={input}
          >
            <option value={0}>Off</option>
            {[5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                After {m} minutes
              </option>
            ))}
          </select>
        </label>
      )}
      {mode !== "none" && (
        <p className="text-xs text-neutral-500">
          TAC-LOG also locks when the computer sleeps or the screen locks. After 5 wrong tries it makes you wait, starting
          at 30 seconds and growing up to an hour. Nothing is ever erased.
        </p>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
      {mode === "pin" && (
        <p className="text-xs text-neutral-500">
          Forgot your PIN? Close TAC-LOG, create an empty file named RESET-PIN in the data folder shown under About
          below, then reopen TAC-LOG. The PIN is cleared and nothing else changes. (This does not work for an encryption
          password. Use the recovery key.)
        </p>
      )}
    </div>
  );
}
