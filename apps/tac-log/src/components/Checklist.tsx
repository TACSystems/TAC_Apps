"use client";

import { useDialogs } from "@core/components/Dialogs";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChecklistItem } from "@/lib/checklist";
import { addItem, deleteItem, deleteList, moveItem, renameList, resetList, toggleItem } from "@/app/checklist/actions";

const input = "input input-sm";

export default function Checklist({ list, items, sections }: { list: string; items: ChecklistItem[]; sections: string[] }) {
  const router = useRouter();
  const { confirm } = useDialogs();
  const [, startTransition] = useTransition();
  const [opt, setOpt] = useOptimistic(items, (state, patch: { id: string; checked: boolean }) =>
    state.map((i) => (i.id === patch.id ? { ...i, checked: patch.checked ? 1 : 0 } : i))
  );
  const [text, setText] = useState("");
  const [section, setSection] = useState(sections[0] ?? "");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list);
  const done = opt.filter((i) => i.checked).length;

  const groups: [string, ChecklistItem[]][] = [];
  for (const it of opt) {
    const key = it.section ?? "";
    const g = groups.find(([k]) => k === key);
    if (g) g[1].push(it);
    else groups.push([key, [it]]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-neutral-400">
          {done} of {opt.length} packed
          <div className="mt-1 h-1 w-64 bg-neutral-800">
            <div className="h-1 bg-brand-amber" style={{ width: `${opt.length ? (done / opt.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="btn btn-secondary">
            Print Checklist
          </button>
          <button
            type="button"
            onClick={() => startTransition(async () => { await resetList(list); router.refresh(); })}
            className="btn btn-secondary"
          >
            Uncheck All
          </button>
          <button type="button" onClick={() => setEditing(!editing)} className="btn btn-secondary">
            {editing ? "Done Editing" : "Edit List"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="no-print flex flex-wrap items-end gap-2 border border-neutral-800 bg-neutral-900 p-3">
          <label className="flex flex-col gap-1 text-xs">
            List name
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <button type="button" onClick={() => startTransition(async () => { await renameList(list, name); router.push(`/checklist?list=${encodeURIComponent(name)}`); })} className="border border-neutral-700 px-3 py-1.5 text-xs">
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              confirm(`Delete the whole "${list}" list?`).then((ok) => ok && startTransition(async () => { await deleteList(list); router.push("/checklist"); }));
            }}
            className="btn btn-danger btn-sm"
          >
            Delete List
          </button>
        </div>
      )}

      <div className="print-checklist grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([sec, list_]) => (
          <div key={sec || "_"} className="break-inside-avoid border border-neutral-800 bg-neutral-900 p-3">
            {sec && <h2 className="mb-2 text-sm text-brand-amber">{sec}</h2>}
            <ul className="flex flex-col gap-1">
              {list_.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-sm">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 normal-case">
                    <input
                      type="checkbox"
                      checked={Boolean(it.checked)}
                      onChange={(e) => {
                        const v = e.target.checked;
                        startTransition(async () => {
                          setOpt({ id: it.id, checked: v });
                          await toggleItem(it.id, v);
                        });
                      }}
                      className="h-4 w-4 accent-[#d1a941]"
                    />
                    <span className={it.checked ? "text-neutral-500 line-through" : ""}>{it.text}</span>
                  </label>
                  {editing && (
                    <span className="no-print flex gap-1">
                      <button type="button" onClick={() => startTransition(async () => { await moveItem(list, it.id, -1); router.refresh(); })} className="border border-neutral-700 px-1 text-xs">↑</button>
                      <button type="button" onClick={() => startTransition(async () => { await moveItem(list, it.id, 1); router.refresh(); })} className="border border-neutral-700 px-1 text-xs">↓</button>
                      <button type="button" onClick={() => startTransition(async () => { await deleteItem(it.id); router.refresh(); })} className="border border-neutral-700 px-1 text-xs text-red-300">✕</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {opt.length === 0 && <p className="text-sm text-neutral-500">This list is empty. Add items below.</p>}
      </div>

      <form
        className="no-print flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text;
          setText("");
          startTransition(async () => { await addItem(list, section, t); router.refresh(); });
        }}
      >
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs">
          Add item
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Shot timer" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Section
          <input list="cl-sections" value={section} onChange={(e) => setSection(e.target.value)} className={input} />
        </label>
        <datalist id="cl-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>
    </div>
  );
}
