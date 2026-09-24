"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FileDrop from "@/components/FileDrop";

export default function RestoreForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setStatus({ ok: false, message: "Choose a backup file first." });
      return;
    }
    if (
      !window.confirm(
        `Restore from "${file.name}"? This replaces everything currently in TAC-LOG with the backup's contents. ` +
          `Your current data is set aside in a "pre-restore" folder first, so it isn't lost.`
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus(null);
    const body = new FormData();
    body.append("file", file);
    if (password) body.append("password", password);
    try {
      const res = await fetch("/api/restore", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsPassword) setNeedsPassword(true);
        let message = data.error ?? "Restore failed.";
        if (data.waitUntil) {
          const secs = Math.ceil((data.waitUntil - Date.now()) / 1000);
          message += ` Try again in ${secs < 60 ? `${secs} seconds` : `${Math.ceil(secs / 60)} minutes`}.`;
        } else if (data.attemptsLeft > 0) {
          message += ` ${data.attemptsLeft} ${data.attemptsLeft === 1 ? "attempt" : "attempts"} left before a wait.`;
        }
        setStatus({ ok: false, message });
        setPassword("");
      } else {
        setStatus({
          ok: true,
          message:
            data.receiptCount == null
              ? "Database restored. (That was a database-only backup, so receipt images were left as they were.)"
              : `Restored, including ${data.receiptCount} receipt file${data.receiptCount === 1 ? "" : "s"}.`,
        });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      }
    } catch {
      setStatus({ ok: false, message: "Restore failed. Couldn't reach the app." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full">
          <FileDrop
            accept=".zip,.tlbak,.db,application/zip"
            label="Select Backup"
            prompt="Drag a backup file (.tlbak, .zip, or .db) here, or"
            onFiles={() => {
              setStatus(null);
              setNeedsPassword(false);
            }}
          />
        </div>
        {needsPassword && (
          <PasswordInput placeholder="Backup password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-200 hover:bg-red-900 disabled:opacity-60"
        >
          {busy ? "Restoring…" : "Restore Backup"}
        </button>
      </div>
      {status && <p className={`text-sm ${status.ok ? "text-green-400" : "text-red-400"}`}>{status.message}</p>}
    </form>
  );
}
