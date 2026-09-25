"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FileDrop from "@core/components/FileDrop";

type Preview = {
  firearms: { make_model: string; serial: string | null; caliber: string | null; duplicate: boolean }[];
  accessories: { make_model: string; serial: string | null; type: string | null; duplicate: boolean }[];
  ammo: { caliber: string; manufacturer: string | null; quantity: number; duplicate: boolean }[];
  goals: { caliber: string; goal: number; existing: number | null; duplicate: boolean }[];
  shotCounts: number;
  warnings: string[];
  sheets: string[];
};

export default function SpreadsheetImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(mode: "preview" | "commit") {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ ok: false, text: "Choose a spreadsheet first." });
      return;
    }
    setBusy(true);
    setStatus(null);
    const body = new FormData();
    body.append("file", file);
    body.append("mode", mode);
    try {
      const res = await fetch("/api/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ ok: false, text: data.error ?? "Import failed." });
        setPreview(null);
      } else if (mode === "preview") {
        setPreview(data.preview);
      } else {
        const c = data.counts;
        setStatus({
          ok: true,
          text: `Imported ${c.firearms} firearm(s), ${c.accessories} accessory(ies), ${c.ammo} ammo purchase(s), and ${c.goals} ammo goal(s).`,
        });
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    } catch {
      setStatus({ ok: false, text: "Import failed. Couldn't reach the app." });
    } finally {
      setBusy(false);
    }
  }

  const newCount = preview
    ? preview.firearms.filter((f) => !f.duplicate).length +
      preview.accessories.filter((a) => !a.duplicate).length +
      preview.ammo.filter((a) => !a.duplicate).length +
      preview.goals.filter((g) => !g.duplicate).length
    : 0;

  const list = (title: string, items: { label: string; dup: boolean }[]) =>
    items.length > 0 && (
      <div>
        <div className="text-xs text-neutral-400">
          {title}: {items.filter((i) => !i.dup).length} new
          {items.some((i) => i.dup) ? `, ${items.filter((i) => i.dup).length} already in TAC-LOG (skipped)` : ""}
        </div>
        <ul className="ml-4 list-disc text-xs text-neutral-300">
          {items.slice(0, 12).map((i, k) => (
            <li key={k} className={i.dup ? "text-neutral-600 line-through" : ""}>
              {i.label}
            </li>
          ))}
          {items.length > 12 && <li className="text-neutral-500">…and {items.length - 12} more</li>}
        </ul>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full">
          <FileDrop
            inputRef={fileRef}
            accept=".xlsx,.csv"
            label="Select Spreadsheet"
            prompt="Drag an Excel (.xlsx) or CSV file here, or"
            onFiles={() => {
              setPreview(null);
              setStatus(null);
            }}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => send("preview")}
          className="btn btn-secondary"
        >
          {busy && !preview ? "Reading…" : "Preview Import"}
        </button>
      </div>
      {preview && (
        <div className="flex flex-col gap-2 border border-neutral-700 bg-neutral-950 p-3">
          <div className="text-xs text-neutral-500">Sheets read: {preview.sheets.join(", ")}</div>
          {list("Firearms", preview.firearms.map((f) => ({ label: `${f.make_model}${f.caliber ? ` · ${f.caliber}` : ""}${f.serial ? ` · SN ${f.serial}` : ""}`, dup: f.duplicate })))}
          {list("Accessories", preview.accessories.map((a) => ({ label: `${a.make_model}${a.type ? ` · ${a.type}` : ""}${a.serial ? ` · SN ${a.serial}` : ""}`, dup: a.duplicate })))}
          {list("Ammo purchases", preview.ammo.map((a) => ({ label: `${a.quantity} × ${a.caliber}${a.manufacturer ? ` · ${a.manufacturer}` : ""}`, dup: a.duplicate })))}
          {list("Ammo goals", preview.goals.map((g) => ({ label: `${g.caliber}: ${g.goal}${g.existing != null && !g.duplicate ? ` (replaces ${g.existing})` : ""}`, dup: g.duplicate })))}
          {preview.shotCounts > 0 && (
            <div className="text-xs text-neutral-400">Shot counts found for {preview.shotCounts} firearm(s); they carry over.</div>
          )}
          {preview.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300">
              {w}
            </p>
          ))}
          {newCount > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => send("commit")}
              className="btn btn-primary w-fit"
            >
              {busy ? "Importing…" : `Import ${newCount} item${newCount === 1 ? "" : "s"}`}
            </button>
          ) : (
            <p className="text-sm text-neutral-400">Nothing new to import.</p>
          )}
        </div>
      )}
      {status && <p className={`text-sm ${status.ok ? "text-green-400" : "text-red-400"}`}>{status.text}</p>}
    </div>
  );
}
