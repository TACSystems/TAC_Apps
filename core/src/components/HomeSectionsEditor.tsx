"use client";

export type HomeSection<K extends string> = { key: K; visible: boolean };

const smallBtn = "btn btn-secondary btn-xs";

export default function HomeSectionsEditor<K extends string>({
  sections,
  labels,
  onChange,
}: {
  sections: HomeSection<K>[];
  labels: Record<K, string>;
  onChange: (next: HomeSection<K>[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const s = [...sections];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    onChange(s);
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((s, i) => (
        <div
          key={s.key}
          className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        >
          <label className="flex flex-1 items-center gap-2 normal-case">
            <input
              type="checkbox"
              checked={s.visible}
              onChange={(e) =>
                onChange(sections.map((x, j) => (j === i ? { ...x, visible: e.target.checked } : x)))
              }
            />
            <span className={s.visible ? "" : "text-neutral-500 line-through"}>{labels[s.key]}</span>
          </label>
          <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)}>
            ↑
          </button>
          <button
            type="button"
            className={smallBtn}
            disabled={i === sections.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
        </div>
      ))}
    </div>
  );
}
