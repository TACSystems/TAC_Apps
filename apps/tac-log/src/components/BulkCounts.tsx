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
          <div className="table-wrap">
            <table className="table">
              <thead>
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
                        className="input input-sm w-28"
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
              className="btn btn-secondary btn-sm"
            >
              Fill all with 0
            </button>
            <button type="button" onClick={() => setValues({})} className="btn btn-secondary btn-sm">
              Clear
            </button>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type RESET to confirm"
              className="input input-sm w-48 text-xs"
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
              className="btn btn-danger btn-sm"
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

export default function BulkCounts({ firearms, calibers }: { firearms?: Row[]; calibers?: Row[] }) {
  return (
    <div className="flex flex-col gap-6">
      {firearms && <Table kind="firearm" title="Rounds Fired per Firearm" rows={firearms} unit="lifetime rounds" />}
      {calibers && <Table kind="ammo" title="Ammo On Hand per Caliber" rows={calibers} unit="rounds on hand" />}
    </div>
  );
}
