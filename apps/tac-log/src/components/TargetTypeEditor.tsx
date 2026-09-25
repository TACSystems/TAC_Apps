"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TargetTypeDef } from "@core/lib/cof-shared";
import { saveTargetTypeAction } from "@/app/targets/actions";

type ZoneRow = { key: number; zone_label: string; value: string };

const input = "border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm normal-case";
const smallBtn = "border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-30";

let nextKey = 1;

export default function TargetTypeEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: TargetTypeDef | null;
  onSaved?: (target: TargetTypeDef) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [zones, setZones] = useState<ZoneRow[]>(
    (initial?.zones.length
      ? initial.zones
      : [
          { zone_label: "", value: 5 },
          { zone_label: "", value: 0 },
        ]
    ).map((z) => ({ key: nextKey++, zone_label: z.zone_label, value: String(z.value) }))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: number, patch: Partial<ZoneRow>) {
    setZones((zs) => zs.map((z) => (z.key === key ? { ...z, ...patch } : z)));
  }

  function move(index: number, dir: -1 | 1) {
    setZones((zs) => {
      const next = [...zs];
      const [row] = next.splice(index, 1);
      next.splice(index + dir, 0, row);
      return next;
    });
  }

  function save() {
    setError(null);
    const payload = {
      id: initial?.id ?? null,
      name,
      description: description || null,
      zones: zones.map((z) => ({ zone_label: z.zone_label, value: Number(z.value) })),
    };
    startTransition(async () => {
      const res = await saveTargetTypeAction(payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const saved: TargetTypeDef = {
        id: res.id,
        name: name.trim(),
        description: description.trim() || null,
        zones: payload.zones.filter((z) => z.zone_label.trim() && Number.isFinite(z.value)),
      };
      if (onSaved) {
        onSaved(saved);
      } else {
        router.push(`/targets/${res.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Target Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. B-27" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — size, color, where to buy"
            className={input}
          />
        </label>
      </div>

      <div>
        <div className="mb-2 text-sm text-neutral-300">Scoring Matrix</div>
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-3 py-2">Zone</th>
                <th className="w-28 px-3 py-2">Points</th>
                <th className="w-40 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {zones.map((z, i) => (
                <tr key={z.key} className="border-t border-neutral-800">
                  <td className="px-3 py-2">
                    <input
                      value={z.zone_label}
                      onChange={(e) => update(z.key, { zone_label: e.target.value })}
                      placeholder="e.g. X/10 Ring"
                      className={`${input} w-full`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={z.value}
                      onChange={(e) => update(z.key, { value: e.target.value })}
                      className={`${input} w-24`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className={smallBtn}
                        disabled={i === zones.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`${smallBtn} text-red-300`}
                        disabled={zones.length === 1}
                        onClick={() => setZones((zs) => zs.filter((x) => x.key !== z.key))}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setZones((zs) => [...zs, { key: nextKey++, zone_label: "", value: "0" }])}
          className="mt-2 text-sm text-brand-amber hover:text-brand-amber-light"
        >
          + Add zone
        </button>
        <p className="mt-1 text-xs text-neutral-500">
          The highest zone value × total rounds is the course&apos;s maximum possible score.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Target Type"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
