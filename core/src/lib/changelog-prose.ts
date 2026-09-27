export type ProseNote = { lead: string | null; body: string };
export type ProseVersion = { version: string; date: string | null; intro: string; notes: ProseNote[] };

const VERSION_HEADING = /^##\s+\[?([0-9][^\]\s]*)\]?\s*(?:[—-]\s*(.+))?$/;

/**
 * TAC-QUAL's changelog is written as prose: a version heading, an opening
 * paragraph, then one paragraph per change led by a bold phrase. A dated
 * heading (`## [0.4.0] — 2026-09-27`) parses the same way, so the two apps can
 * keep their own house style without two formats to write for.
 */
export function parseProseChangelog(md: string): ProseVersion[] {
  const versions: ProseVersion[] = [];
  let current: ProseVersion | null = null;
  let para: string[] = [];

  const flush = () => {
    const text = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (!text || !current) return;
    if (!current.intro && !/^\*\*/.test(text)) {
      current.intro = text;
      return;
    }
    const m = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    current.notes.push(m ? { lead: m[1].replace(/[.:]$/, ""), body: m[2] } : { lead: null, body: text });
  };

  for (const line of md.split(/\r?\n/)) {
    const vh = line.match(VERSION_HEADING);
    if (vh) {
      flush();
      current = { version: vh[1], date: vh[2]?.trim() ?? null, intro: "", notes: [] };
      versions.push(current);
      continue;
    }
    if (/^#\s/.test(line)) continue;
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return versions.filter((v) => !/planned/i.test(v.date ?? ""));
}
