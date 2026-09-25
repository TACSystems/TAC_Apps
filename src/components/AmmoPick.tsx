"use client";

import { encodePickClient, type PickOpt } from "@/lib/ammo-pick";


function text(o: PickOpt, withCaliber: boolean) {
  const parts = [withCaliber ? o.caliber : null, o.ammo_type, o.grain != null ? `${o.grain}gr` : null, o.manufacturer].filter(Boolean);
  return `${parts.join(" · ") || o.caliber} (${o.on_hand.toLocaleString()} on hand)`;
}

export default function AmmoPick({
  options,
  caliber,
  value,
  onChange,
  name = "ammo_pick",
  className = "",
}: {
  options: PickOpt[];
  caliber: string | null | undefined;
  value: string;
  onChange: (v: string) => void;
  name?: string;
  className?: string;
}) {
  const cal = (caliber ?? "").toLowerCase();
  const same = cal ? options.filter((o) => o.caliber.toLowerCase() === cal) : [];
  const other = options.filter((o) => !same.includes(o));
  const known = options.some((o) => encodePickClient(o) === value);
  return (
    <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">— Not specified —</option>
      {value && !known && <option value={value}>{(() => {
        try {
          const v = JSON.parse(value) as (string | number | null)[];
          return v.filter((x) => x != null && x !== "").map((x, i) => (i === 2 ? `${x}gr` : x)).join(" · ");
        } catch {
          return value;
        }
      })()}</option>}
      {same.length > 0 && (
        <optgroup label={caliber ?? ""}>
          {same.map((o) => {
            const v = encodePickClient(o);
            return (
              <option key={v} value={v}>
                {text(o, false)}
              </option>
            );
          })}
        </optgroup>
      )}
      {other.length > 0 && (
        <optgroup label={same.length ? "Other calibers" : "Ammo on hand"}>
          {other.map((o) => {
            const v = encodePickClient(o);
            return (
              <option key={v} value={v}>
                {text(o, true)}
              </option>
            );
          })}
        </optgroup>
      )}
    </select>
  );
}
