export function normalizeCategories(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? parseList(raw) : [];
  const out: string[] = [];
  for (const v of list) {
    const s = typeof v === "string" ? v.trim().slice(0, 40) : "";
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out.slice(0, 12);
}

function parseList(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const PLATFORM_RULES: { category: string; test: RegExp }[] = [
  { category: "shotgun", test: /shotgun|gauge|\bpump\b/i },
  { category: "rifle", test: /rifle|carbine|\bsbr\b|ar pistol|\bar-?15\b|\bak\b|pcc/i },
  { category: "handgun", test: /pistol|revolver|handgun/i },
];

export function platformCategory(platform: string | null | undefined): string | null {
  if (!platform) return null;
  for (const r of PLATFORM_RULES) if (r.test.test(platform)) return r.category;
  return null;
}

export function firearmMatchesCategories(platform: string | null | undefined, categories: string[]): boolean {
  if (!platform || !categories.length) return false;
  const base = platformCategory(platform);
  return categories.some((c) => {
    const lc = c.toLowerCase();
    if (base && lc === base) return true;
    return platform.toLowerCase().includes(lc);
  });
}

const TEXT_RULES: { category: string; test: RegExp }[] = [
  { category: "Handgun", test: /holster|handgun|pistol|revolver|\bhg\b/i },
  { category: "Rifle", test: /rifle|carbine|\brfl\b|\bsbr\b|sling/i },
  { category: "Shotgun", test: /shotgun|buckshot|\bslug|birdshot|gauge/i },
];

export function suggestCategories(text: string, available: string[]): string[] {
  const out: string[] = [];
  for (const r of TEXT_RULES) {
    const match = available.find((a) => a.toLowerCase() === r.category.toLowerCase());
    if (match && r.test.test(text)) out.push(match);
  }
  return out;
}

export const WEAPON_SEP = " / ";

const WEAPON_TYPE_RULES: { type: string; test: RegExp }[] = [
  { type: "shotgun", test: /shotgun|gauge|\bpump\b/i },
  { type: "rifle", test: /rifle|carbine|\bsbr\b|\bar-?15\b|\bak\b|pcc/i },
  { type: "handgun", test: /handgun|pistol|revolver/i },
];

export function weaponTypeOf(category: string): string {
  for (const r of WEAPON_TYPE_RULES) if (r.test.test(category)) return r.type;
  return category.trim().toLowerCase();
}

/**
 * Derived, never stored, so it cannot drift from the categories: a course is
 * combined arms when its categories span more than one weapon type.
 */
export function isCombinedArms(categories: string[]): boolean {
  const types = new Set(categories.map(weaponTypeOf).filter(Boolean));
  return types.size > 1;
}

export function splitWeaponCell(v: string | undefined | null): string[] {
  if (!v) return [];
  return String(v)
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinWeapons(parts: string[]): string {
  return parts.join(WEAPON_SEP);
}

/**
 * Every weapon a string may be fired with, and every combination of them, in
 * category order — the order the rounds cell is read in. Beyond four
 * categories the full power set is unusable in a dropdown, so it narrows to
 * singles, pairs and the whole line.
 */
export function weaponOptions(categories: string[]): string[] {
  const list = categories.map((c) => c.trim()).filter(Boolean);
  if (!list.length) return [];
  const out: string[] = [];
  const push = (parts: string[]) => {
    const v = joinWeapons(parts);
    if (v && !out.includes(v)) out.push(v);
  };
  if (list.length <= 4) {
    for (let size = 1; size <= list.length; size++) {
      for (const combo of combinations(list, size)) push(combo);
    }
    return out;
  }
  for (const c of list) push([c]);
  for (const combo of combinations(list, 2)) push(combo);
  push(list);
  return out;
}

function combinations<T>(list: T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i <= list.length - size; i++) {
    for (const rest of combinations(list.slice(i + 1), size - 1)) out.push([list[i], ...rest]);
  }
  return out;
}

/**
 * A stored cell spelled differently in case is the same weapon, so it selects
 * the matching option rather than reading as off-list. The cell itself is left
 * alone until the user picks something.
 */
export function matchWeaponOption(cell: string | undefined | null, options: string[]): string | null {
  const v = String(cell ?? "").trim();
  if (!v) return null;
  const exact = options.find((o) => o === v);
  if (exact) return exact;
  const key = splitWeaponCell(v).join("|").toLowerCase();
  return options.find((o) => splitWeaponCell(o).join("|").toLowerCase() === key) ?? null;
}

export function roundsPartsFor(cell: string | undefined | null, count: number): string[] {
  const parts = String(cell ?? "")
    .split("/")
    .map((s) => s.trim());
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => parts[i] ?? "");
}

export function joinRoundsParts(parts: string[]): string {
  const trimmed = parts.map((p) => p.trim());
  while (trimmed.length > 1 && trimmed[trimmed.length - 1] === "") trimmed.pop();
  if (trimmed.every((p) => p === "")) return "";
  return trimmed.join(WEAPON_SEP);
}
