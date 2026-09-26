"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ZoneDef } from "@core/lib/cof-shared";
import {
  computePhaseRounds,
  maxPointsFor,
  type CourseColumn,
  type CourseDef,
  type ScorecardConfig,
  type TargetTypeDef,
} from "@core/lib/cof-shared";
import TargetTypeEditor from "@core/components/TargetTypeEditor";
import CategoryPicker from "@core/components/CategoryPicker";
import { clearUnsaved, useUnsaved } from "@core/components/UnsavedGuard";
import HelpTip from "@core/components/HelpTip";
import ColumnsEditor from "@core/components/course-builder/ColumnsEditor";
import PhasesEditor from "@core/components/course-builder/PhasesEditor";
import ScorecardEditor from "@core/components/course-builder/ScorecardEditor";
import { DEFAULT_NEW_COLUMNS, addLink, input, toNum, uid, type BPhase } from "@core/components/course-builder/model";

export default function CourseBuilder({
  initial,
  targets: initialTargets,
  mode,
  positionOptions = [],
  categoryOptions = [],
  saveAction,
  saveTargetAction,
}: {
  saveAction: (payload: unknown) => Promise<{ error: string } | { id: string }>;
  saveTargetAction: (payload: { id?: string | null; name: string; description: string | null; zones: ZoneDef[] }) => Promise<{ error: string } | { id: string }>;
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
      const res = await saveAction(payload);
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
            <span>
              Passing Score (%) <HelpTip text="The minimum final score, as a percent of the maximum possible points, to count as PASS. Leave blank for no pass/fail." />
            </span>
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
              saveAction={saveTargetAction}
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
          <p className="text-xs text-neutral-500">Without a target type, runs of this course can&apos;t be scored.</p>
        )}
      </section>

      <ColumnsEditor columns={columns} setColumns={setColumns} />

      <PhasesEditor phases={phases} setPhases={setPhases} columns={columns} positionOptions={positionOptions} />

      <ScorecardEditor scorecard={scorecard} setScorecard={setScorecard} />

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-neutral-700 bg-neutral-950 py-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn btn-primary"
        >
          {pending ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Course"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
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
