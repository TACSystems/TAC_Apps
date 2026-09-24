"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCorrect } from "@/app/counts/actions";

type Row = { key: string; label: string; current: number };

function Table({ kind, title, rows, unit }: { kind: "firearm" | "ammo"; title: string; rows: Row[]; unit: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = rows.filter((r) => values[r.key] !== undefined && values[r.key] !== "" && Number(values[r.key]) !== r.current);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm text-neutral-200">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-500">Nothing here yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-xs text-neutral-400">
                <tr>
                  <th className="px-3 py-2">{kind === "firearm" ? "Firearm" : "Caliber"}</th>
                  <th className="px-3 py-2">Now</th>
                  <th className="px-3 py-2">Set to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-neutral-800">
                    <td className="px-3 py-1.5">{r.label}</td>
                    <td className="px-3 py-1.5 text-neutral-400">{r.current.toLocaleString()}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={values[r.key] ?? ""}
                        placeholder="unchanged"
                        onChange={(e) => setValues({ ...values, [r.key]: e.target.value })}
                        className="w-28 border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.key, "0"])))}
              className="border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
            >
              Fill all with 0
            </button>
            <button type="button" onClick={() => setValues({})} className="border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800">
              Clear
            </button>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type RESET to confirm"
              className="w-48 border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={pending || changed.length === 0 || confirm.trim().toUpperCase() !== "RESET"}
              onClick={() =>
                startTransition(async () => {
                  const res = await bulkCorrect(
                    kind,
                    changed.map((r) => ({ key: r.key, value: Number(values[r.key]) })),
                    confirm
                  );
                  setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Done." : res.error ?? "Failed." });
                  if (res.ok) {
                    setValues({});
                    setConfirm("");
                    router.refresh();
                  }
                })
              }
              className="border border-red-900 bg-red-950 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900 disabled:opacity-50"
            >
              {pending ? "Applying…" : `Apply ${changed.length} change${changed.length === 1 ? "" : "s"}`}
            </button>
          </div>
          <p className="text-xs text-neutral-500">Each change is saved as a correction ({unit}) you can remove later from that item&apos;s page. A safety copy of the database is made first.</p>
        </>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

export default function BulkCounts({ firearms, calibers }: { firearms: Row[]; calibers: Row[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Table kind="firearm" title="Rounds Fired per Firearm" rows={firearms} unit="lifetime rounds" />
      <Table kind="ammo" title="Ammo On Hand per Caliber" rows={calibers} unit="rounds on hand" />
    </div>
  );
}
