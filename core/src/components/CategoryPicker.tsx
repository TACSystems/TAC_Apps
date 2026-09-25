"use client";

export default function CategoryPicker({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const extra = value.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()));
  const all = [...options, ...extra];
  const has = (o: string) => value.some((v) => v.toLowerCase() === o.toLowerCase());
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
      {all.map((o) => {
        const on = has(o);
        return (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 border normal-case select-none ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
              on ? "border-brand-amber bg-brand-tile text-neutral-100" : "border-neutral-700 text-neutral-400 hover:text-neutral-100"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(on ? value.filter((v) => v.toLowerCase() !== o.toLowerCase()) : [...value, o])}
              className="accent-[#d1a941]"
            />
            {o}
          </label>
        );
      })}
    </div>
  );
}
