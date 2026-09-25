export type PickOpt = { caliber: string; ammo_type: string | null; grain: number | null; manufacturer: string | null; on_hand: number };

export function encodePickClient(p: Omit<PickOpt, "on_hand">) {
  return JSON.stringify([p.caliber, p.ammo_type ?? null, p.grain ?? null, p.manufacturer ?? null]);
}

export function defaultPickFor(options: PickOpt[], caliber: string | null | undefined, last?: string) {
  if (last && options.some((o) => encodePickClient(o) === last)) return last;
  const same = caliber ? options.filter((o) => o.caliber.toLowerCase() === caliber.toLowerCase()) : [];
  return same.length === 1 ? encodePickClient(same[0]) : last ?? "";
}
