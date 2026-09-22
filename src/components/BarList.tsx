export default function BarList({
  rows,
  unit,
  emptyText,
}: {
  rows: { label: string; value: number; note?: string }[];
  unit: string;
  emptyText: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  if (rows.length === 0 || max === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-1.5" role="table">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        return (
          <div
            key={r.label}
            role="row"
            title={`${r.label}: ${r.value.toLocaleString()} ${unit}${r.note ? ` (${r.note})` : ""}`}
            className="group grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm"
          >
            <span role="cell" className="truncate text-neutral-400">
              {r.label}
            </span>
            <span role="cell" className="relative h-4 bg-neutral-900">
              <span
                className="absolute inset-y-0 left-0 bg-[#3987e5] group-hover:brightness-125"
                style={{ width: `${Math.max(pct, r.value > 0 ? 1 : 0)}%` }}
              />
            </span>
            <span role="cell" className="text-right tabular-nums text-neutral-200">
              {r.value.toLocaleString()}
              {r.note ? <span className="text-xs text-neutral-500"> {r.note}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
