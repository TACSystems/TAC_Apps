"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "@/app/lock/actions";

export default function LockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const res = await unlock(pin);
            if (res.ok) router.refresh();
            else {
              setError(res.error ?? "Wrong PIN.");
              setPin("");
            }
          });
        }}
        className="flex w-full max-w-xs flex-col items-center gap-4"
      >
        <div className="relative flex flex-col items-center px-5 py-3 leading-tight">
          <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-blue-400" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-blue-400" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-blue-400" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-blue-400" />
          <span className="text-2xl font-semibold tracking-widest">TAC-LOG</span>
          <span className="text-[10px] tracking-[0.3em] text-neutral-500">Precision Systems</span>
        </div>
        <label className="flex w-full flex-col gap-1 text-sm">
          Enter PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
            className="border border-neutral-700 bg-neutral-900 px-3 py-3 text-center text-2xl tracking-[0.5em]"
          />
        </label>
        <button
          type="submit"
          disabled={pending || pin.length < 4}
          className="w-full bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
