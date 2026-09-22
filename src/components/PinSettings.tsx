"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePin, saveAutoLock, savePin } from "@/app/lock/actions";

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm";
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);

export default function PinSettings({ pinSet, autoLockMinutes }: { pinSet: boolean; autoLockMinutes: number }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "Something went wrong." });
      if (res.ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-400">
        {pinSet
          ? "A PIN is set. TAC-LOG asks for it every time it opens."
          : "Require a PIN (4–12 digits) to open TAC-LOG. It keeps casual users of this computer out of the app; it doesn't encrypt the data file."}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {pinSet && (
          <label className="flex flex-col gap-1 text-sm">
            Current PIN
            <input type="password" inputMode="numeric" value={current} onChange={(e) => setCurrent(digits(e.target.value))} className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          {pinSet ? "New PIN" : "PIN"}
          <input type="password" inputMode="numeric" value={next} onChange={(e) => setNext(digits(e.target.value))} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm {pinSet ? "new " : ""}PIN
          <input type="password" inputMode="numeric" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => savePin(current, next, confirm))}
          className="bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          {pinSet ? "Change PIN" : "Set PIN"}
        </button>
        {pinSet && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Remove the PIN? TAC-LOG will open without asking.")) run(() => removePin(current));
            }}
            className="border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-200 hover:bg-red-900 disabled:opacity-60"
          >
            Remove PIN
          </button>
        )}
      </div>
      {pinSet && (
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
      {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
      {pinSet && (
        <p className="text-xs text-neutral-500">
          Forgot your PIN? Close TAC-LOG, create an empty file named RESET-PIN in the data folder shown under About
          below, then reopen TAC-LOG. The PIN is cleared and nothing else changes.
        </p>
      )}
    </div>
  );
}
