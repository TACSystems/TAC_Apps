"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BUILTIN_COLUMN_KEYS,
  BUILTIN_COLUMN_LABELS,
  BUILTIN_FIELD_KEYS,
  BUILTIN_FIELD_LABELS,
  computePhaseRounds,
  maxPointsFor,
  type CourseColumn,
  type CourseDef,
  type ScorecardConfig,
  type ScorecardField,
  type StringRow,
  type TargetTypeDef,
} from "@/lib/cof-shared";
import { saveCourseAction } from "@/app/courses/actions";
import TargetTypeEditor from "@/components/TargetTypeEditor";
import CategoryPicker from "@/components/CategoryPicker";
import { clearUnsaved, useUnsaved } from "@/components/UnsavedGuard";

type BRow = StringRow & { uid: string };
type BPhase = { uid: string; title: string; notes: string; total: string; strings: BRow[] };

const input = "border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm normal-case";
const cellInput = "w-full min-w-[4rem] border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm normal-case";
const smallBtn = "border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800 disabled:opacity-30";
const addLink = "text-sm text-brand-amber hover:text-brand-amber-light";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function customKey(prefix: string) {
  return `${prefix}_${uid().replace(/-/g, "").slice(0, 8)}`;
}

function moved<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DEFAULT_NEW_COLUMNS: CourseColumn[] = ["distance", "rounds", "time_limit", "position", "action"].map(
  (k) => ({ key: k, label: BUILTIN_COLUMN_LABELS[k as keyof typeof BUILTIN_COLUMN_LABELS] })
);

export default function CourseBuilder({
  initial,
  targets: initialTargets,
  mode,
  positionOptions = [],
  categoryOptions = [],
}: {
  initial: CourseDef | null;
  targets: TargetTypeDef[];
  mode: "new" | "edit";
  positionOptions?: string[];
  categoryOptions?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [targets, setTargets] = useState(initialTargets);
  const [showTargetEditor, setShowTargetEditor] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [totalOverride, setTotalOverride] = useState(
    initial?.total_rounds != null ? String(initial.total_rounds) : ""
  );
  const [targetId, setTargetId] = useState(initial?.target_type_id ?? initialTargets[0]?.id ?? "");
  const [passing, setPassing] = useState(
    initial?.passing_score_percent != null ? String(initial.passing_score_percent) : ""
  );
  const [columns, setColumns] = useState<CourseColumn[]>(initial?.columns ?? DEFAULT_NEW_COLUMNS);
  const [scorecard, setScorecard] = useState<ScorecardConfig>(
    initial?.scorecard ?? {
      header: [
        { key: "shooter_name", label: "Shooter Name", wide: true },
        { key: "date", label: "Date" },
        { key: "range_location", label: "Range / Location" },
        { key: "weapon_used", label: "Weapon" },
        { key: "caliber", label: "Caliber" },
        { key: "grain", label: "Grain" },
        { key: "ammo_lot", label: "Ammo Lot #" },
        { key: "weather_conditions", label: "Weather Conditions", wide: true },
      ],
      signoff: [
        { key: "grader_name", label: "Grader Name" },
        { key: "grader_date", label: "Grader Date" },
        { key: "grader_signature", label: "Grader Signature", wide: true, printOnly: true },
      ],
    }
  );
  const [phases, setPhases] = useState<BPhase[]>(() =>
    initial?.phases.length
      ? initial.phases.map((p) => ({
          uid: uid(),
          title: p.title,
          notes: p.notes ?? "",
          total: p.phase_total_rounds != null ? String(p.phase_total_rounds) : "",
          strings: p.strings.map((s) => ({ ...s, values: { ...s.values }, uid: uid() })),
        }))
      : [
          {
            uid: uid(),
            title: "Phase 1",
            notes: "",
            total: "",
            strings: [{ uid: uid(), row_type: "string", string_number: 1, option_label: null, values: {} }],
          },
        ]
  );

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        code,
        categories,
        notes,
        totalOverride,
        targetId,
        passing,
        columns,
        scorecard,
        phases: phases.map((p) => ({
          title: p.title,
          notes: p.notes,
          total: p.total,
          strings: p.strings.map((st) => ({ ...st, uid: undefined })),
        })),
      }),
    [name, code, categories, notes, totalOverride, targetId, passing, columns, scorecard, phases]
  );
  const [baseline] = useState(snapshot);
  const [saved, setSaved] = useState(false);
  useUnsaved(!saved && snapshot !== baseline);

  const target = targets.find((t) => t.id === targetId) ?? null;
  const computedTotal = useMemo(
    () =>
      phases.reduce((sum, p) => sum + (toNum(p.total) ?? computePhaseRounds({ strings: p.strings })), 0),
    [phases]
  );
  const effectiveTotal = toNum(totalOverride) ?? computedTotal;
  const maxPoints = target ? maxPointsFor(effectiveTotal, target.zones) : 0;

  const missingBuiltinColumns = BUILTIN_COLUMN_KEYS.filter((k) => !columns.some((c) => c.key === k));
  const allFields = [...scorecard.header, ...scorecard.signoff];
  const missingBuiltinFields = BUILTIN_FIELD_KEYS.filter((k) => !allFields.some((f) => f.key === k));

  function nextStringNumber() {
    let max = 0;
    for (const p of phases) for (const s of p.strings) if (s.string_number != null) max = Math.max(max, s.string_number);
    return max + 1;
  }

  function updatePhase(pid: string, patch: Partial<BPhase>) {
    setPhases((ps) => ps.map((p) => (p.uid === pid ? { ...p, ...patch } : p)));
  }

  function updateRows(pid: string, fn: (rows: BRow[]) => BRow[]) {
    setPhases((ps) => ps.map((p) => (p.uid === pid ? { ...p, strings: fn(p.strings) } : p)));
  }

  function updateRow(pid: string, rid: string, patch: Partial<BRow>) {
    updateRows(pid, (rows) => rows.map((r) => (r.uid === rid ? { ...r, ...patch } : r)));
  }

  function setCell(pid: string, rid: string, key: string, value: string) {
    updateRows(pid, (rows) =>
      rows.map((r) => (r.uid === rid ? { ...r, values: { ...r.values, [key]: value } } : r))
    );
  }

  function addString(pid: string) {
    const n = nextStringNumber();
    updateRows(pid, (rows) => {
      const last = [...rows].reverse().find((r) => r.row_type === "string");
      const carry: Record<string, string> = {};
      if (last?.values.distance) carry.distance = last.values.distance;
      return [...rows, { uid: uid(), row_type: "string", string_number: n, option_label: null, values: carry }];
    });
  }

  function addOption(pid: string, row: BRow) {
    updateRows(pid, (rows) => {
      const idx = rows.findIndex((r) => r.uid === row.uid);
      const siblings = rows.filter((r) => r.row_type === "string" && r.string_number === row.string_number);
      const letter = (i: number) => `OPTION ${String.fromCharCode(65 + i)}`;
      const next = rows.map((r) =>
        r.uid === row.uid && !r.option_label ? { ...r, option_label: letter(0) } : r
      );
      let insertAt = idx;
      for (let i = idx; i < next.length; i++) {
        if (next[i].row_type === "string" && next[i].string_number === row.string_number) insertAt = i;
      }
      next.splice(insertAt + 1, 0, {
        uid: uid(),
        row_type: "string",
        string_number: row.string_number,
        option_label: letter(Math.max(siblings.length, 1)),
        values: { ...row.values },
      });
      return next;
    });
  }

  function renumber() {
    let n = 0;
    setPhases((ps) =>
      ps.map((p) => {
        let prevOriginal: number | null | undefined = undefined;
        return {
          ...p,
          strings: p.strings.map((s) => {
            if (s.row_type !== "string") return s;
            const sameGroup = s.option_label && prevOriginal !== undefined && s.string_number === prevOriginal;
            prevOriginal = s.string_number;
            if (!sameGroup) n += 1;
            return { ...s, string_number: n };
          }),
        };
      })
    );
  }

  function setField(list: "header" | "signoff", index: number, patch: Partial<ScorecardField>) {
    setScorecard((sc) => ({
      ...sc,
      [list]: sc[list].map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  function save() {
    setError(null);
    if (!categories.length) {
      setError("Pick at least one category (Handgun, Rifle, Shotgun, and so on).");
      return;
    }
    const payload: CourseDef = {
      id: mode === "edit" ? initial?.id : undefined,
      name,
      code,
      notes: notes || null,
      total_rounds: toNum(totalOverride),
      target_type_id: targetId || null,
      passing_score_percent: toNum(passing),
      columns,
      scorecard,
      categories,
      phases: phases.map((p) => ({
        title: p.title,
        notes: p.notes || null,
        phase_total_rounds: toNum(p.total),
        strings: p.strings.map((s) => ({
          row_type: s.row_type,
          string_number: s.string_number,
          option_label: s.option_label,
          values: s.values,
        })),
      })),
    };
    startTransition(async () => {
      const res = await saveCourseAction(payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      clearUnsaved();
      router.push(`/courses/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <datalist id="builder-positions">
        {positionOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">1 · Course Details</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Course Name
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Duty Pistol Qualification" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Code / Document ID
            <input value={code} onChange={(e) => setCode(e.target.value)} className={input} placeholder="e.g. DPQ-50" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Passing Score (%)
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              value={passing}
              onChange={(e) => setPassing(e.target.value)}
              className={input}
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Total Rounds
            <input
              type="number"
              min={0}
              step="any"
              value={totalOverride}
              onChange={(e) => setTotalOverride(e.target.value)}
              className={input}
              placeholder={`Auto: ${computedTotal}`}
            />
          </label>
          <div className="flex flex-col justify-end text-xs text-neutral-500">
            Calculated from strings: {computedTotal} rounds
            {toNum(totalOverride) != null && toNum(totalOverride) !== computedTotal && (
              <span className="text-brand-amber">Override in use ({effectiveTotal})</span>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm sm:col-span-3">
            <span className="uppercase tracking-[0.06em]">Category</span>
            <CategoryPicker options={categoryOptions} value={categories} onChange={setCategories} />
            <span className="text-xs text-neutral-500">Pick every type the course uses. Edit the list in Controls.</span>
          </div>
          <label className="flex flex-col gap-1 text-sm sm:col-span-3">
            Description / Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">2 · Target Type &amp; Scoring</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Target Type
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={input}>
              <option value="">— None —</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={addLink} onClick={() => setShowTargetEditor((v) => !v)}>
            {showTargetEditor ? "Close" : "+ New target type"}
          </button>
          <Link href="/targets" target="_blank" className="text-xs text-neutral-500 hover:text-neutral-300">
            Manage target types ↗
          </Link>
        </div>
        {showTargetEditor && (
          <div className="border border-neutral-700 bg-neutral-900/50 p-4">
            <TargetTypeEditor
              onCancel={() => setShowTargetEditor(false)}
              onSaved={(t) => {
                setTargets((ts) => [...ts.filter((x) => x.id !== t.id), t].sort((a, b) => a.name.localeCompare(b.name)));
                setTargetId(t.id);
                setShowTargetEditor(false);
              }}
            />
          </div>
        )}
        {target ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {target.zones.map((z) => (
              <span key={z.zone_label} className="border border-neutral-800 bg-neutral-900 px-2 py-1">
                {z.zone_label}: <span className="text-neutral-400">{z.value}</span>
              </span>
            ))}
            <span className="px-2 py-1 text-neutral-500">Max possible: {maxPoints} pts</span>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Without a target type, range sessions on this course can&apos;t be scored.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">3 · String Table Columns</h2>
        <p className="text-xs text-neutral-500">
          &quot;#&quot; (string number and option) is always first. Rename, reorder, remove, or add your own columns.
        </p>
        <div className="flex flex-col gap-2">
          {columns.map((c, i) => (
            <div key={c.key} className="flex flex-wrap items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => setColumns((cs) => cs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                className={`${input} w-56`}
              />
              <span className="text-xs text-neutral-600">
                {c.key in BUILTIN_COLUMN_LABELS ? "standard" : "custom"}
                {c.key === "rounds" ? " · used for round totals" : ""}
              </span>
              <button type="button" className={smallBtn} disabled={i === 0} onClick={() => setColumns((cs) => moved(cs, i, -1))}>
                ↑
              </button>
              <button
                type="button"
                className={smallBtn}
                disabled={i === columns.length - 1}
                onClick={() => setColumns((cs) => moved(cs, i, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={`${smallBtn} text-red-300`}
                onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className={addLink}
            onClick={() => setColumns((cs) => [...cs, { key: customKey("x"), label: "New Column" }])}
          >
            + Add custom column
          </button>
          {missingBuiltinColumns.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const k = e.target.value as keyof typeof BUILTIN_COLUMN_LABELS;
                if (k) setColumns((cs) => [...cs, { key: k, label: BUILTIN_COLUMN_LABELS[k] }]);
              }}
              className={input}
            >
              <option value="">+ Restore standard column…</option>
              {missingBuiltinColumns.map((k) => (
                <option key={k} value={k}>
                  {BUILTIN_COLUMN_LABELS[k]}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-neutral-200">4 · Phases &amp; Strings</h2>
          <button type="button" className={smallBtn} onClick={renumber}>
            Renumber strings 1…n
          </button>
        </div>

        {phases.map((phase, pi) => {
          const auto = computePhaseRounds({ strings: phase.strings });
          return (
            <div key={phase.uid} className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
                  Phase {pi + 1} Title
                  <input value={phase.title} onChange={(e) => updatePhase(phase.uid, { title: e.target.value })} className={input} />
                </label>
                <label className="flex w-32 flex-col gap-1 text-sm">
                  Rounds
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={phase.total}
                    onChange={(e) => updatePhase(phase.uid, { total: e.target.value })}
                    placeholder={`Auto: ${auto}`}
                    className={input}
                  />
                </label>
                <div className="flex gap-1 pb-1">
                  <button type="button" className={smallBtn} disabled={pi === 0} onClick={() => setPhases((ps) => moved(ps, pi, -1))}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    disabled={pi === phases.length - 1}
                    onClick={() => setPhases((ps) => moved(ps, pi, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    onClick={() =>
                      setPhases((ps) => {
                        const copy: BPhase = {
                          ...phase,
                          uid: uid(),
                          title: `${phase.title} (copy)`,
                          strings: phase.strings.map((s) => ({ ...s, values: { ...s.values }, uid: uid() })),
                        };
                        const next = [...ps];
                        next.splice(pi + 1, 0, copy);
                        return next;
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={`${smallBtn} text-red-300`}
                    disabled={phases.length === 1}
                    onClick={() => {
                      if (window.confirm(`Remove "${phase.title}" and its ${phase.strings.length} row(s)?`)) {
                        setPhases((ps) => ps.filter((p) => p.uid !== phase.uid));
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <textarea
                value={phase.notes}
                onChange={(e) => updatePhase(phase.uid, { notes: e.target.value })}
                rows={1}
                placeholder="Phase notes (optional) — setup, target placement, reminders"
                className={input}
              />

              <div className="overflow-x-auto border border-neutral-800">
                <table className="w-full table-auto text-left text-sm">
                  <thead className="bg-neutral-900 text-xs text-neutral-400">
                    <tr>
                      <th className="w-20 px-2 py-2">#</th>
                      <th className="w-28 px-2 py-2">Option</th>
                      {columns.map((c) => (
                        <th key={c.key} className={`px-2 py-2 ${c.key === "action" ? "w-[32%]" : ""}`}>
                          {c.label}
                        </th>
                      ))}
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {phase.strings.map((row, ri) => (
                      <tr key={row.uid} className="border-t border-neutral-800 align-top">
                        {row.row_type === "note" ? (
                          <td colSpan={columns.length + 2} className="px-2 py-1.5">
                            <input
                              value={row.values.action ?? ""}
                              onChange={(e) => setCell(phase.uid, row.uid, "action", e.target.value)}
                              placeholder="Instruction row, e.g. * TRANSITION TO 7 YARD LINE *"
                              className={`${cellInput} text-center text-brand-amber`}
                            />
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                step="any"
                                value={row.string_number ?? ""}
                                onChange={(e) => updateRow(phase.uid, row.uid, { string_number: toNum(e.target.value) })}
                                className={`${cellInput} !min-w-[3.5rem] w-14`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={row.option_label ?? ""}
                                onChange={(e) =>
                                  updateRow(phase.uid, row.uid, { option_label: e.target.value || null })
                                }
                                placeholder="—"
                                className={`${cellInput} !min-w-[5.5rem] w-24`}
                              />
                            </td>
                            {columns.map((c) =>
                              c.key === "action" ? (
                                <td key={c.key} className="px-2 py-1.5">
                                  <textarea
                                    value={row.values[c.key] ?? ""}
                                    onChange={(e) => setCell(phase.uid, row.uid, c.key, e.target.value)}
                                    rows={1}
                                    className={`${cellInput} !min-w-[12rem] resize-none [field-sizing:content]`}
                                  />
                                </td>
                              ) : (
                                <td key={c.key} className="px-2 py-1.5">
                                  <input
                                    value={row.values[c.key] ?? ""}
                                    onChange={(e) => setCell(phase.uid, row.uid, c.key, e.target.value)}
                                    list={c.key === "position" && positionOptions.length ? "builder-positions" : undefined}
                                    autoComplete="off"
                                    className={cellInput}
                                  />
                                </td>
                              )
                            )}
                          </>
                        )}
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              className={smallBtn}
                              disabled={ri === 0}
                              title="Move up"
                              onClick={() => updateRows(phase.uid, (rows) => moved(rows, ri, -1))}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={smallBtn}
                              disabled={ri === phase.strings.length - 1}
                              title="Move down"
                              onClick={() => updateRows(phase.uid, (rows) => moved(rows, ri, 1))}
                            >
                              ↓
                            </button>
                            {row.row_type === "string" && (
                              <button
                                type="button"
                                className={smallBtn}
                                title="Add an alternate option for this string"
                                onClick={() => addOption(phase.uid, row)}
                              >
                                +Opt
                              </button>
                            )}
                            <button
                              type="button"
                              className={smallBtn}
                              title="Duplicate row"
                              onClick={() =>
                                updateRows(phase.uid, (rows) => {
                                  const next = [...rows];
                                  next.splice(ri + 1, 0, {
                                    ...row,
                                    uid: uid(),
                                    values: { ...row.values },
                                    string_number: row.row_type === "string" ? nextStringNumber() : null,
                                    option_label: null,
                                  });
                                  return next;
                                })
                              }
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className={`${smallBtn} text-red-300`}
                              title="Remove row"
                              onClick={() => updateRows(phase.uid, (rows) => rows.filter((r) => r.uid !== row.uid))}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4">
                <button type="button" className={addLink} onClick={() => addString(phase.uid)}>
                  + String
                </button>
                <button
                  type="button"
                  className={addLink}
                  onClick={() =>
                    updateRows(phase.uid, (rows) => [
                      ...rows,
                      { uid: uid(), row_type: "note", string_number: null, option_label: null, values: {} },
                    ])
                  }
                >
                  + Instruction row
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className={`${addLink} w-fit`}
          onClick={() =>
            setPhases((ps) => [
              ...ps,
              {
                uid: uid(),
                title: `Phase ${ps.length + 1}`,
                notes: "",
                total: "",
                strings: [
                  { uid: uid(), row_type: "string", string_number: nextStringNumber(), option_label: null, values: {} },
                ],
              },
            ])
          }
        >
          + Add phase
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-200">5 · Scorecard Fields</h2>
        <p className="text-xs text-neutral-500">
          These lines print on the scorecard and appear on the Log a Range Session form. &quot;Wide&quot; spans the full width;
          &quot;Print only&quot; is for lines like signatures that are filled in by hand.
        </p>
        {(["header", "signoff"] as const).map((list) => (
          <div key={list} className="flex flex-col gap-2">
            <div className="text-sm text-neutral-300">
              {list === "header" ? "Top of card" : "Sign-off (bottom of card)"}
            </div>
            {scorecard[list].map((f, i) => (
              <div key={f.key} className="flex flex-wrap items-center gap-3">
                <input
                  value={f.label}
                  onChange={(e) => setField(list, i, { label: e.target.value })}
                  className={`${input} w-56`}
                />
                <label className="flex items-center gap-1 text-xs normal-case">
                  <input type="checkbox" checked={Boolean(f.wide)} onChange={(e) => setField(list, i, { wide: e.target.checked })} />
                  Wide
                </label>
                <label className="flex items-center gap-1 text-xs normal-case">
                  <input
                    type="checkbox"
                    checked={Boolean(f.printOnly)}
                    onChange={(e) => setField(list, i, { printOnly: e.target.checked })}
                  />
                  Print only
                </label>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === 0}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: moved(sc[list], i, -1) }))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === scorecard[list].length - 1}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: moved(sc[list], i, 1) }))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  title="Move to the other section"
                  onClick={() =>
                    setScorecard((sc) => {
                      const other = list === "header" ? "signoff" : "header";
                      return { ...sc, [list]: sc[list].filter((_, j) => j !== i), [other]: [...sc[other], f] } as ScorecardConfig;
                    })
                  }
                >
                  {list === "header" ? "→ Sign-off" : "→ Top"}
                </button>
                <button
                  type="button"
                  className={`${smallBtn} text-red-300`}
                  onClick={() => setScorecard((sc) => ({ ...sc, [list]: sc[list].filter((_, j) => j !== i) }))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`${addLink} w-fit`}
              onClick={() =>
                setScorecard((sc) => ({ ...sc, [list]: [...sc[list], { key: customKey("f"), label: "New Field" }] }))
              }
            >
              + Add field
            </button>
          </div>
        ))}
        {missingBuiltinFields.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const k = e.target.value as keyof typeof BUILTIN_FIELD_LABELS;
              if (!k) return;
              const field: ScorecardField = {
                key: k,
                label: BUILTIN_FIELD_LABELS[k],
                printOnly: k === "grader_signature",
              };
              setScorecard((sc) =>
                k.startsWith("grader_") ? { ...sc, signoff: [...sc.signoff, field] } : { ...sc, header: [...sc.header, field] }
              );
            }}
            className={`${input} w-fit`}
          >
            <option value="">+ Restore standard field…</option>
            {missingBuiltinFields.map((k) => (
              <option key={k} value={k}>
                {BUILTIN_FIELD_LABELS[k]}
              </option>
            ))}
          </select>
        )}
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-neutral-700 bg-neutral-950 py-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Course"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
        >
          Cancel
        </button>
        <span className="text-xs text-neutral-500">
          {phases.length} phase{phases.length === 1 ? "" : "s"} · {effectiveTotal} rounds
          {target ? ` · ${target.name}` : ""}
          {toNum(passing) != null ? ` · pass ${toNum(passing)}%` : ""}
        </span>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
