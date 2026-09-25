import {
  effectivePhaseRounds,
  maxPointsFor,
  passFail,
  type LoadedCourse,
  type ScorecardField,
} from "@core/lib/cof-shared";

type Variant = "screen" | "print";

const styles: Record<Variant, { table: string; th: string; td: string; note: string; muted: string; h2: string }> = {
  screen: {
    table: "w-full text-left text-sm",
    th: "bg-neutral-900 px-3 py-2 text-neutral-400",
    td: "border-t border-neutral-800 px-3 py-2 align-top",
    note: "border-t border-neutral-800 bg-neutral-950 px-3 py-2 text-center text-xs tracking-widest text-brand-amber",
    muted: "text-neutral-500",
    h2: "mb-2 font-medium text-neutral-200",
  },
  print: {
    table: "w-full border-collapse text-xs",
    th: "border border-black px-2 py-1 text-left",
    td: "border border-black px-2 py-1 align-top",
    note: "border border-black bg-neutral-100 px-2 py-1 text-center text-[10px] font-semibold tracking-widest",
    muted: "text-neutral-600",
    h2: "font-semibold uppercase",
  },
};

export function CourseStrings({ course, variant }: { course: LoadedCourse; variant: Variant }) {
  const s = styles[variant];
  const colCount = course.columns.length + 1;
  return (
    <div className="flex flex-col gap-4">
      {course.phases.map((phase, pi) => {
        const rounds = effectivePhaseRounds(phase);
        return (
          <section key={pi} className="break-inside-avoid">
            <h2 className={s.h2}>
              {phase.title}
              {rounds > 0 && <span className={`ml-2 text-sm font-normal ${s.muted}`}>({rounds} rounds)</span>}
            </h2>
            {phase.notes && <p className={`mb-1 text-xs whitespace-pre-line ${s.muted}`}>{phase.notes}</p>}
            <div className={variant === "screen" ? "overflow-x-auto border border-neutral-800" : ""}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.th}>#</th>
                    {course.columns.map((c) => (
                      <th key={c.key} className={s.th}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phase.strings.map((row, ri) =>
                    row.row_type === "note" ? (
                      <tr key={ri}>
                        <td colSpan={colCount} className={s.note}>
                          {row.values.action ?? ""}
                        </td>
                      </tr>
                    ) : (
                      <tr key={ri}>
                        <td className={`${s.td} whitespace-nowrap`}>
                          {row.string_number ?? ""}
                          {row.option_label ? ` (${row.option_label})` : ""}
                        </td>
                        {course.columns.map((c) => (
                          <td key={c.key} className={s.td}>
                            {row.values[c.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                  {phase.strings.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className={`${s.td} ${s.muted}`}>
                        No strings in this phase.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export type FilledScorecard = {
  fields: Record<string, string | null | undefined>;
  zones: { zone_label: string; value: number; counted: number; subtotal: number }[];
  rounds_fired: number | null;
  rounds_counted: number | null;
  total_points: number | null;
  final_score_percent: number | null;
  passing_score_percent: number | null;
  notes: string | null;
};

function FieldLine({ field, value }: { field: ScorecardField; value?: string | null }) {
  return (
    <div className={`flex items-end gap-2 ${field.wide ? "col-span-2" : ""}`}>
      <span className="whitespace-nowrap">{field.label}:</span>
      <span className="min-h-[1.25rem] flex-1 border-b border-black">{value ?? " "}</span>
    </div>
  );
}

export function PrintScorecard({ course, filled }: { course: LoadedCourse; filled?: FilledScorecard }) {
  const zones = filled
    ? filled.zones
    : (course.target?.zones ?? []).map((z) => ({ ...z, counted: null, subtotal: null }));
  const total = course.effective_total_rounds;
  const maxPoints = maxPointsFor(total, course.target?.zones ?? []);
  const passing = filled ? filled.passing_score_percent : course.passing_score_percent;
  const result = filled ? passFail(filled.final_score_percent, passing) : null;

  return (
    <div className="break-inside-avoid">
      <h2 className="mb-2 font-semibold uppercase">Scoring Card</h2>
      {course.scorecard.header.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {course.scorecard.header.map((f) => (
            <FieldLine key={f.key} field={f} value={filled?.fields[f.key]} />
          ))}
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-left">Zone</th>
            <th className="border border-black px-2 py-1 text-left">Value</th>
            <th className="border border-black px-2 py-1 text-left">Counted</th>
            <th className="border border-black px-2 py-1 text-left">C × V</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z, i) => (
            <tr key={i}>
              <td className="border border-black px-2 py-1">{z.zone_label}</td>
              <td className="border border-black px-2 py-1">{z.value}</td>
              <td className="border border-black px-2 py-1">{z.counted ?? " "}</td>
              <td className="border border-black px-2 py-1">{z.subtotal ?? " "}</td>
            </tr>
          ))}
          {zones.length === 0 && (
            <tr>
              <td colSpan={4} className="border border-black px-2 py-1 text-neutral-600">
                No target type / scoring zones set for this course.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          Rounds Fired: {filled ? filled.rounds_fired ?? "—" : "____"} / {total}
        </div>
        <div>
          Rounds Counted: {filled ? filled.rounds_counted ?? "—" : "____"} / {total}
        </div>
        <div>
          Total Points: {filled ? filled.total_points ?? "—" : "________"}
          {maxPoints > 0 ? ` / ${maxPoints}` : ""}
        </div>
        <div>
          Final Score:{" "}
          {filled
            ? filled.final_score_percent != null
              ? `${filled.final_score_percent}%`
              : "—"
            : "________ %"}
        </div>
        {passing != null && (
          <div className="col-span-2 flex items-center gap-4">
            <span>Passing Score: {passing}%</span>
            {filled ? (
              <span className="border-2 border-black px-3 py-0.5 font-bold tracking-widest">
                {result ?? "—"}
              </span>
            ) : (
              <span className="flex gap-4">
                <span>☐ PASS</span>
                <span>☐ FAIL</span>
              </span>
            )}
          </div>
        )}
      </div>

      {course.scorecard.signoff.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {course.scorecard.signoff.map((f) => (
            <FieldLine key={f.key} field={f} value={filled?.fields[f.key]} />
          ))}
        </div>
      )}

      {filled?.notes && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Notes: </span>
          {filled.notes}
        </p>
      )}
    </div>
  );
}

export function PrintHeader({ course }: { course: LoadedCourse }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold uppercase">{course.name}</h1>
      <p className="text-sm">
        {course.code} · {course.effective_total_rounds} rounds
        {course.target ? ` · Target: ${course.target.name}` : ""}
        {course.passing_score_percent != null ? ` · Passing: ${course.passing_score_percent}%` : ""}
      </p>
      {course.notes && <p className="mt-1 text-xs whitespace-pre-line">{course.notes}</p>}
    </div>
  );
}

export function PrintFooter() {
  return (
    <p className="mt-8 text-center text-[10px] tracking-widest text-neutral-500">
      [ TAC-LOG — PRECISION SYSTEMS ]
    </p>
  );
}
