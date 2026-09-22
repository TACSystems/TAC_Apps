"use client";

import { useMemo, useState } from "react";

// Reference categorical palette (dark mode), validated against this app's
// dark surface with scripts/validate_palette.js from the dataviz skill —
// all adjacent/CVD/contrast checks pass. Fixed order, never cycled per-render.
const SERIES_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

export type ChartPoint = { date: string; score: number };
export type ChartSeries = { name: string; points: ChartPoint[] };

export default function ScoreTrendChart({ series }: { series: ChartSeries[] }) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const width = 780;
  const height = 360;
  const padding = { top: 16, right: 16, bottom: 36, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const allDates = useMemo(
    () => Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort(),
    [series]
  );

  const xFor = (date: string) => {
    const i = allDates.indexOf(date);
    if (allDates.length <= 1) return padding.left + plotW / 2;
    return padding.left + (i / (allDates.length - 1)) * plotW;
  };
  const yFor = (score: number) => padding.top + plotH - (score / 100) * plotH;

  const gridLines = [0, 25, 50, 75, 100];

  if (series.length === 0 || allDates.length === 0) {
    return (
      <div className="border border-neutral-800 bg-neutral-900 p-6 text-center text-sm text-neutral-500">
        No scored range sessions yet for this course.
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 bg-neutral-900 p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => {
          setHoverX(null);
          setHoverDate(null);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          let nearest = allDates[0];
          let nearestDist = Infinity;
          for (const d of allDates) {
            const dist = Math.abs(xFor(d) - px);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = d;
            }
          }
          setHoverX(xFor(nearest));
          setHoverDate(nearest);
        }}
      >
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke="#2c2c2a"
              strokeWidth={1}
            />
            <text x={padding.left - 8} y={yFor(g)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#898781">
              {g}
            </text>
          </g>
        ))}

        {allDates.map((d, i) => {
          if (allDates.length > 10 && i % Math.ceil(allDates.length / 10) !== 0) return null;
          return (
            <text
              key={d}
              x={xFor(d)}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#898781"
            >
              {d.slice(5)}
            </text>
          );
        })}

        {hoverX != null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#4c5236"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const pts = s.points.slice().sort((a, b) => a.date.localeCompare(b.date));
          const path = pts
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFor(p.date)} ${yFor(p.score)}`)
            .join(" ");
          const last = pts[pts.length - 1];

          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
              {pts.map((p) => (
                <circle key={p.date} cx={xFor(p.date)} cy={yFor(p.score)} r={4} fill={color} />
              ))}
              {last && (
                <text
                  x={xFor(last.date) + 8}
                  y={yFor(last.score)}
                  fontSize={10}
                  fill={color}
                  dominantBaseline="middle"
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hoverDate && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-300">
          <span className="text-neutral-500">{hoverDate}:</span>
          {series.map((s, i) => {
            const p = s.points.find((pt) => pt.date === hoverDate);
            if (!p) return null;
            return (
              <span key={s.name} style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                {s.name} {p.score}%
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-800 pt-3 text-xs">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-neutral-300">
            <span
              className="inline-block h-2 w-2"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
