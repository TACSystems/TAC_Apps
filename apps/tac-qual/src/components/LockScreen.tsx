"use client";

import PasswordInput from "@core/components/PasswordInput";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlock, unlockWithRecovery } from "@/app/lock/actions";

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export default function LockScreen({
  mode,
  initialWaitSeconds,
}: {
  mode: "pin" | "password";
  initialWaitSeconds: number;
}) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [rKey, setRKey] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pending, startTransition] = useTransition();
  const [left, setLeft] = useCountdown(initialWaitSeconds);
  const blocked = left > 0;
  const isPin = mode === "pin";

  function handle(res: { ok: boolean; error?: string; waitUntil?: number }) {
    if (res.ok) {
      router.refresh();
      return;
    }
    setError(res.error ?? "Wrong entry.");
    if (res.waitUntil) setLeft(Math.max(1, Math.ceil((res.waitUntil - Date.now()) / 1000)));
    setSecret("");
  }

  const field = "input py-3";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            handle(recovery ? await unlockWithRecovery(rKey, pw, pw2) : await unlock(secret));
          });
        }}
        className="flex w-full max-w-sm flex-col items-center gap-4"
      >
        <div className="relative flex flex-col items-center px-5 py-3 leading-tight">
          <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-brand-amber" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-brand-amber" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-brand-amber" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-brand-amber" />
          <span className="text-2xl font-bold tracking-widest">TAC-QUAL</span>
        </div>

        {recovery ? (
          <>
            <label className="flex w-full flex-col gap-1 text-sm">
              Recovery key
              <input
                autoFocus
                autoComplete="off"
                value={rKey}
                onChange={(e) => setRKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                className={`${field} text-center text-sm tracking-wider`}
              />
            </label>
            <label className="flex w-full flex-col gap-1 text-sm">
              New password (8+ characters)
              <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
            </label>
            <label className="flex w-full flex-col gap-1 text-sm">
              Confirm new password
              <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} />
            </label>
          </>
        ) : (
          <label className="flex w-full flex-col gap-1 text-sm">
            {isPin ? "Enter PIN" : "Enter password"}
            <PasswordInput inputMode={isPin ? "numeric" : undefined}
              autoComplete="off"
              autoFocus
              value={secret}
              disabled={blocked}
              onChange={(e) => setSecret(isPin ? e.target.value.replace(/\D/g, "").slice(0, 12) : e.target.value)}
              className={`${field} text-center ${isPin ? "text-2xl tracking-[0.5em]" : "text-lg"}`}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={pending || blocked || (!recovery && secret.length < (isPin ? 4 : 1))}
          className="btn btn-primary w-full"
        >
          {blocked ? `Wait ${fmt(left)}` : pending ? "Checking…" : recovery ? "Reset password and unlock" : "Unlock"}
        </button>
        {error && !blocked && <p className="text-center text-sm text-red-400">{error}</p>}
        {blocked && (
          <p className="text-center text-sm text-red-400">
            Too many wrong attempts. You can try again in {fmt(left)}. Nothing has been erased.
          </p>
        )}
        {!isPin && (
          <button
            type="button"
            onClick={() => {
              setRecovery(!recovery);
              setError(null);
            }}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            {recovery ? "Back to password" : "Forgot your password? Use your recovery key"}
          </button>
        )}
      </form>
    </div>
  );
}
