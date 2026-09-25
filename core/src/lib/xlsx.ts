import { readZip } from "@core/lib/zip";

export type Cell = string | number | null;
export type Sheet = { name: string; rows: Cell[][]; dateCols?: Set<string> };

function decode(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(xml: string) {
  const parts = [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1]));
  return parts.join("");
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
}

function colIndex(ref: string) {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

export function excelDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseXlsx(buf: Buffer): Sheet[] {
  const files = new Map(readZip(buf).map((e) => [e.name.replace(/^\/+/, ""), e.data.toString("utf8")]));
  const workbook = files.get("xl/workbook.xml");
  if (!workbook) throw new Error("That file isn't an Excel workbook (.xlsx).");

  const rels = new Map<string, string>();
  for (const m of (files.get("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }

  const shared: string[] = [];
  for (const m of (files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));

  const styles = files.get("xl/styles.xml") ?? "";
  const customDate = new Set<number>();
  for (const m of styles.matchAll(/<numFmt\b[^>]*>/g)) {
    const id = Number(attr(m[0], "numFmtId"));
    const code = (attr(m[0], "formatCode") ?? "").replace(/"[^"]*"|\[[^\]]*\]/g, "").toLowerCase();
    if (/[dmy]/.test(code) && !/^[#0.,%\s]*$/.test(code)) customDate.add(id);
  }
  const xfDate: boolean[] = [];
  const cellXfs = styles.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  for (const m of cellXfs.matchAll(/<xf\b[^>]*\/?>/g)) {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    xfDate.push(BUILTIN_DATE_FORMATS.has(id) || customDate.has(id));
  }

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], "name") ?? "Sheet";
    const rid = attr(m[0], "r:id");
    const path = rid ? rels.get(rid) : null;
    const xml = path ? files.get(path) : null;
    if (!xml) continue;
    const rows: Cell[][] = [];
    for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rIdx = Number(attr(`<row${rm[1]}>`, "r") ?? rows.length + 1) - 1;
      const row: Cell[] = [];
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tag = `<c${cm[1]}>`;
        const ref = attr(tag, "r") ?? "";
        const t = attr(tag, "t");
        const sIdx = Number(attr(tag, "s") ?? 0);
        const inner = cm[2] ?? "";
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value: Cell = null;
        if (t === "s" && v != null) value = shared[Number(v)] ?? null;
        else if (t === "inlineStr") value = textOf(inner);
        else if (t === "str" || t === "e") value = v != null ? decode(v) : null;
        else if (t === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v != null) {
          const n = Number(v);
          value = Number.isFinite(n) ? (xfDate[sIdx] ? excelDate(n) : n) : decode(v);
        }
        row[colIndex(ref)] = typeof value === "string" ? value.trim() || null : value;
      }
      rows[rIdx] = row;
    }
    sheets.push({ name, rows: Array.from(rows, (r) => r ?? []) });
  }
  return sheets;
}

export function parseCsv(text: string): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field = "";
  let quoted = false;
  const push = () => {
    const f = field.trim();
    row.push(f === "" ? null : f);
    field = "";
  };
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") push();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      push();
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    push();
    rows.push(row);
  }
  return rows;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return "";
    if (typeof v === "number") return String(v);
    const guarded = /^[=+\-@\t]/.test(v) ? `'${v}` : v;
    return /[",\n\r]/.test(guarded) || guarded !== v ? `"${guarded.replace(/"/g, '""')}"` : guarded;
  };
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
