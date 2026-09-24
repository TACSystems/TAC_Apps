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
