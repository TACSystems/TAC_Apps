import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import {
  BUILTIN_COLUMN_KEYS,
  BUILTIN_COLUMN_LABELS,
  DEFAULT_SCORECARD,
  isBuiltinColumn,
  computeCourseRounds,
  normalizeColumns,
  normalizeScorecard,
  parseJson,
  type CourseColumn,
  type ScorecardConfig,
  type ZoneDef,
  type TargetTypeDef,
  type StringRow,
  type PhaseDef,
  type CourseDef,
  type LoadedCourse,
} from "./cof-shared";
import { normalizeCategories } from "@core/lib/course-categories";

export * from "./cof-shared";

type CourseRow = {
  id: string;
  categories_json: string | null;
  code: string;
  name: string;
  total_rounds: number | null;
  target_type: string | null;
  target_type_id: string | null;
  passing_score_percent: number | null;
  columns_json: string | null;
  scorecard_json: string | null;
  notes: string | null;
};

type StringDbRow = {
  phase_id: string;
  row_type: string;
  string_number: number | null;
  option_label: string | null;
  distance: string | null;
  weapon: string | null;
  rounds: string | null;
  time_limit: string | null;
  position: string | null;
  action: string | null;
  extra_json: string | null;
};

export function loadTargetType(db: Database.Database, id: string | null): TargetTypeDef | null {
  if (!id) return null;
  const t = db.prepare(`select id, name, description from target_types where id = ?`).get(id) as
    | { id: string; name: string; description: string | null }
    | undefined;
  if (!t) return null;
  const zones = db
    .prepare(
      `select zone_label, value from target_type_zones where target_type_id = ? order by sort_order, value desc`
    )
    .all(id) as ZoneDef[];
  return { ...t, zones };
}

export function listTargetTypes(db: Database.Database): (TargetTypeDef & { course_count: number })[] {
  const rows = db
    .prepare(
      `select t.id, t.name, t.description,
         (select count(*) from courses_of_fire c where c.target_type_id = t.id) as course_count
       from target_types t order by t.name`
    )
    .all() as { id: string; name: string; description: string | null; course_count: number }[];
  const zoneStmt = db.prepare(
    `select zone_label, value from target_type_zones where target_type_id = ? order by sort_order, value desc`
  );
  return rows.map((r) => ({ ...r, zones: zoneStmt.all(r.id) as ZoneDef[] }));
}

export function loadCourse(db: Database.Database, id: string): LoadedCourse | null {
  const c = db.prepare(`select * from courses_of_fire where id = ?`).get(id) as CourseRow | undefined;
  if (!c) return null;

  const phaseRows = db
    .prepare(`select * from cof_phases where cof_id = ? order by phase_number`)
    .all(id) as { id: string; title: string; notes: string | null; phase_total_rounds: number | null }[];

  const stringRows = db
    .prepare(
      `select s.* from cof_strings s join cof_phases p on p.id = s.phase_id
       where p.cof_id = ? order by s.sort_order, s.string_number`
    )
    .all(id) as StringDbRow[];

  const phases: PhaseDef[] = phaseRows.map((p) => ({
    title: p.title,
    notes: p.notes,
    phase_total_rounds: p.phase_total_rounds,
    strings: stringRows
      .filter((s) => s.phase_id === p.id)
      .map((s) => {
        const values: Record<string, string> = {
          ...parseJson<Record<string, string>>(s.extra_json, {}),
        };
        for (const k of BUILTIN_COLUMN_KEYS) {
          const v = s[k];
          if (v != null && v !== "") values[k] = String(v);
        }
        return {
          row_type: s.row_type === "note" ? "note" : "string",
          string_number: s.string_number,
          option_label: s.option_label,
          values,
        } as StringRow;
      }),
  }));

  let columns = normalizeColumns(parseJson<unknown>(c.columns_json, null));
  if (!columns) {
    const usesWeapon = phases.some((p) => p.strings.some((s) => s.values.weapon));
    columns = BUILTIN_COLUMN_KEYS.filter((k) => k !== "weapon" || usesWeapon).map((k) => ({
      key: k,
      label: BUILTIN_COLUMN_LABELS[k],
    }));
  }

  const scorecard = c.scorecard_json
    ? normalizeScorecard(parseJson<unknown>(c.scorecard_json, null))
    : structuredClone(DEFAULT_SCORECARD);

  const computed = computeCourseRounds(phases);

  return {
    id: c.id,
    code: c.code,
    name: c.name,
    notes: c.notes,
    total_rounds: c.total_rounds,
    target_type_id: c.target_type_id,
    passing_score_percent: c.passing_score_percent,
    columns,
    scorecard,
    phases,
    categories: normalizeCategories(c.categories_json),
    target: loadTargetType(db, c.target_type_id),
    computed_total_rounds: computed,
    effective_total_rounds: c.total_rounds ?? computed,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function validateCourseDef(input: unknown): { def: CourseDef } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Nothing to save." };
  const raw = input as Record<string, unknown>;
  const name = strOrNull(raw.name);
  const code = strOrNull(raw.code);
  if (!name) return { error: "Give the course a name." };
  if (!code) return { error: "Give the course a short code (e.g. QUAL-50)." };

  const columns = normalizeColumns(raw.columns) ?? [];
  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  if (phasesRaw.length === 0) return { error: "Add at least one phase." };

  const phases: PhaseDef[] = phasesRaw.map((p, i) => {
    const pr = (p ?? {}) as Record<string, unknown>;
    const strings = (Array.isArray(pr.strings) ? pr.strings : []).map((s) => {
      const sr = (s ?? {}) as Record<string, unknown>;
      const valuesRaw = (sr.values ?? {}) as Record<string, unknown>;
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(valuesRaw)) {
        const sv = strOrNull(v);
        if (sv != null && /^[a-z0-9_]+$/i.test(k)) values[k] = sv;
      }
      return {
        row_type: sr.row_type === "note" ? "note" : "string",
        string_number: sr.row_type === "note" ? null : numOrNull(sr.string_number),
        option_label: sr.row_type === "note" ? null : strOrNull(sr.option_label),
        values,
      } as StringRow;
    });
    return {
      title: strOrNull(pr.title) ?? `Phase ${i + 1}`,
      notes: strOrNull(pr.notes),
      phase_total_rounds: numOrNull(pr.phase_total_rounds),
      strings,
    };
  });

  const passing = numOrNull(raw.passing_score_percent);
  if (passing != null && (passing < 0 || passing > 100)) {
    return { error: "Passing score must be between 0 and 100%." };
  }

  return {
    def: {
      id: strOrNull(raw.id) ?? undefined,
      code,
      name,
      notes: strOrNull(raw.notes),
      total_rounds: numOrNull(raw.total_rounds),
      target_type_id: strOrNull(raw.target_type_id),
      passing_score_percent: passing,
      columns,
      scorecard: normalizeScorecard(raw.scorecard),
      phases,
      categories: normalizeCategories(raw.categories),
    },
  };
}

export function saveCourse(db: Database.Database, def: CourseDef): string {
  const existingByCode = db.prepare(`select id from courses_of_fire where code = ?`).get(def.code) as
    | { id: string }
    | undefined;
  if (existingByCode && existingByCode.id !== def.id) {
    throw new Error(`Another course already uses the code "${def.code}". Pick a different code.`);
  }

  const target = def.target_type_id
    ? (db.prepare(`select name from target_types where id = ?`).get(def.target_type_id) as
        | { name: string }
        | undefined)
    : undefined;

  const id = def.id ?? randomUUID();

  const tx = db.transaction(() => {
    const row = {
      id,
      code: def.code,
      name: def.name,
      notes: def.notes,
      total_rounds: def.total_rounds,
      target_type: target?.name ?? null,
      target_type_id: target ? def.target_type_id : null,
      passing_score_percent: def.passing_score_percent,
      columns_json: JSON.stringify(def.columns),
      scorecard_json: JSON.stringify(def.scorecard),
      categories_json: def.categories.length ? JSON.stringify(def.categories) : null,
    };
    const exists = db.prepare(`select 1 from courses_of_fire where id = ?`).get(id);
    if (exists) {
      db.prepare(
        `update courses_of_fire set code=@code, name=@name, notes=@notes, total_rounds=@total_rounds,
           target_type=@target_type, target_type_id=@target_type_id,
           passing_score_percent=@passing_score_percent, columns_json=@columns_json,
           scorecard_json=@scorecard_json, categories_json=@categories_json
         where id=@id`
      ).run(row);
    } else {
      db.prepare(
        `insert into courses_of_fire (id, code, name, notes, total_rounds, target_type, target_type_id,
           passing_score_percent, columns_json, scorecard_json, categories_json)
         values (@id, @code, @name, @notes, @total_rounds, @target_type, @target_type_id,
           @passing_score_percent, @columns_json, @scorecard_json, @categories_json)`
      ).run(row);
    }

    db.prepare(`delete from cof_phases where cof_id = ?`).run(id);

    const insertPhase = db.prepare(
      `insert into cof_phases (id, cof_id, phase_number, title, phase_total_rounds, notes)
       values (?, ?, ?, ?, ?, ?)`
    );
    const insertString = db.prepare(
      `insert into cof_strings (id, phase_id, sort_order, row_type, string_number, option_label,
         distance, weapon, rounds, time_limit, position, action, extra_json)
       values (@id, @phase_id, @sort_order, @row_type, @string_number, @option_label,
         @distance, @weapon, @rounds, @time_limit, @position, @action, @extra_json)`
    );

    def.phases.forEach((phase, pi) => {
      const phaseId = randomUUID();
      insertPhase.run(phaseId, id, pi + 1, phase.title, phase.phase_total_rounds, phase.notes);
      phase.strings.forEach((s, si) => {
        const extra: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.values)) {
          if (!isBuiltinColumn(k)) extra[k] = v;
        }
        insertString.run({
          id: randomUUID(),
          phase_id: phaseId,
          sort_order: si,
          row_type: s.row_type,
          string_number: s.string_number,
          option_label: s.option_label,
          distance: s.values.distance ?? null,
          weapon: s.values.weapon ?? null,
          rounds: s.values.rounds ?? null,
          time_limit: s.values.time_limit ?? null,
          position: s.values.position ?? null,
          action: s.values.action ?? null,
          extra_json: Object.keys(extra).length ? JSON.stringify(extra) : null,
        });
      });
    });
  });

  tx();
  return id;
}

export function saveTargetType(
  db: Database.Database,
  input: { id?: string | null; name: string; description: string | null; zones: ZoneDef[] }
): string {
  const name = input.name.trim();
  if (!name) throw new Error("Give the target type a name.");
  const clash = db.prepare(`select id from target_types where name = ? collate nocase`).get(name) as
    | { id: string }
    | undefined;
  if (clash && clash.id !== input.id) {
    throw new Error(`A target type named "${name}" already exists.`);
  }
  const zones = input.zones
    .map((z) => ({ zone_label: z.zone_label.trim(), value: Number(z.value) }))
    .filter((z) => z.zone_label && Number.isFinite(z.value));
  if (zones.length === 0) throw new Error("Add at least one scoring zone.");
  const labels = new Set<string>();
  for (const z of zones) {
    if (labels.has(z.zone_label.toLowerCase())) throw new Error(`Zone "${z.zone_label}" is listed twice.`);
    labels.add(z.zone_label.toLowerCase());
  }

  const id = input.id ?? randomUUID();
  db.transaction(() => {
    const exists = db.prepare(`select 1 from target_types where id = ?`).get(id);
    if (exists) {
      db.prepare(`update target_types set name = ?, description = ? where id = ?`).run(
        name,
        input.description,
        id
      );
    } else {
      db.prepare(`insert into target_types (id, name, description) values (?, ?, ?)`).run(
        id,
        name,
        input.description
      );
    }
    db.prepare(`delete from target_type_zones where target_type_id = ?`).run(id);
    const ins = db.prepare(
      `insert into target_type_zones (id, target_type_id, zone_label, value, sort_order) values (?, ?, ?, ?, ?)`
    );
    zones.forEach((z, i) => ins.run(randomUUID(), id, z.zone_label, z.value, i));
    db.prepare(`update courses_of_fire set target_type = ? where target_type_id = ?`).run(name, id);
  })();
  return id;
}

function zonesEqual(a: ZoneDef[], b: ZoneDef[]) {
  if (a.length !== b.length) return false;
  const key = (z: ZoneDef) => `${z.zone_label.toLowerCase()}=${Number(z.value)}`;
  const sa = a.map(key).sort().join("|");
  const sb = b.map(key).sort().join("|");
  return sa === sb;
}

export function resolveTargetType(
  db: Database.Database,
  name: string | null,
  zones: ZoneDef[],
  suffixHint: string
): string | null {
  const cleanZones = zones.filter((z) => z && z.zone_label != null);
  if (!name && cleanZones.length === 0) return null;
  const baseName = (name ?? "Custom Target").trim() || "Custom Target";

  const candidates = db
    .prepare(`select id, name from target_types where name = ? collate nocase or name like ? collate nocase`)
    .all(baseName, `${baseName} (%)`) as { id: string; name: string }[];

  for (const c of candidates) {
    const t = loadTargetType(db, c.id);
    if (t && (cleanZones.length === 0 || zonesEqual(t.zones, cleanZones))) return c.id;
  }

  if (cleanZones.length === 0) return null;

  let finalName = baseName;
  const taken = (n: string) =>
    Boolean(db.prepare(`select 1 from target_types where name = ? collate nocase`).get(n));
  if (taken(finalName)) finalName = `${baseName} (${suffixHint})`;
  let i = 2;
  while (taken(finalName)) finalName = `${baseName} (${suffixHint} ${i++})`;

  return saveTargetType(db, { name: finalName, description: null, zones: cleanZones });
}

export type CofPatchString = {
  row_type?: "string" | "note";
  string_number: number | null;
  option_label: string | null;
  distance?: string | null;
  weapon?: string | null;
  rounds?: string | number | null;
  time_limit?: string | null;
  position?: string | null;
  action?: string | null;
  extra?: Record<string, string>;
};

export type CofPatchPhase = {
  phase_number?: number;
  title: string;
  notes?: string | null;
  phase_total_rounds: number | null;
  strings: CofPatchString[];
};

export type CofPatchCourse = {
  code: string;
  name: string;
  total_rounds: number | null;
  target_type: string | null;
  notes?: string | null;
  passing_score_percent?: number | null;
  columns?: CourseColumn[];
  scorecard?: ScorecardConfig;
  phases: CofPatchPhase[];
  scoring_zones: ZoneDef[];
  categories?: string[];
};

export type CofPatch = { format?: string; courses: CofPatchCourse[] };

export function applyCofPatch(db: Database.Database, patch: CofPatch) {
  let coursesUpserted = 0;
  const run = db.transaction((courses: CofPatchCourse[]) => {
    for (const course of courses) {
      if (!course || !course.code || !course.name) continue;
      const targetId = resolveTargetType(
        db,
        course.target_type ?? null,
        Array.isArray(course.scoring_zones) ? course.scoring_zones : [],
        course.code
      );
      const existing = db.prepare(`select id from courses_of_fire where code = ?`).get(course.code) as
        | { id: string }
        | undefined;

      const phases = [...(course.phases ?? [])]
        .sort((a, b) => (a.phase_number ?? 0) - (b.phase_number ?? 0))
        .map((p) => ({
          title: p.title,
          notes: p.notes ?? null,
          phase_total_rounds: p.phase_total_rounds ?? null,
          strings: (p.strings ?? []).map((s) => {
            const values: Record<string, string> = {};
            for (const k of BUILTIN_COLUMN_KEYS) {
              const v = s[k];
              if (v != null && v !== "") values[k] = String(v);
            }
            for (const [k, v] of Object.entries(s.extra ?? {})) {
              if (v != null && v !== "") values[k] = String(v);
            }
            return {
              row_type: s.row_type === "note" ? "note" : "string",
              string_number: s.string_number ?? null,
              option_label: s.option_label ?? null,
              values,
            } as StringRow;
          }),
        }));

      const usesWeapon = phases.some((p) => p.strings.some((s) => s.values.weapon));
      const columns =
        normalizeColumns(course.columns) ??
        BUILTIN_COLUMN_KEYS.filter((k) => k !== "weapon" || usesWeapon).map((k) => ({
          key: k,
          label: BUILTIN_COLUMN_LABELS[k],
        }));

      const checked = validateCourseDef({
        id: existing?.id,
        code: course.code,
        name: course.name,
        notes: course.notes ?? null,
        total_rounds: course.total_rounds,
        target_type_id: targetId,
        passing_score_percent: course.passing_score_percent ?? null,
        columns,
        scorecard: course.scorecard ?? DEFAULT_SCORECARD,
        phases,
        categories: course.categories ?? [],
      });
      if ("error" in checked) throw new Error(`${course.code}: ${checked.error}`);
      saveCourse(db, checked.def);
      coursesUpserted += 1;
    }
  });
  run(patch.courses);
  return { coursesUpserted };
}

export function exportCourse(course: LoadedCourse): CofPatchCourse {
  return {
    code: course.code,
    name: course.name,
    notes: course.notes,
    total_rounds: course.total_rounds,
    target_type: course.target?.name ?? null,
    passing_score_percent: course.passing_score_percent,
    columns: course.columns,
    scorecard: course.scorecard,
    scoring_zones: course.target?.zones ?? [],
    categories: course.categories,
    phases: course.phases.map((p, i) => ({
      phase_number: i + 1,
      title: p.title,
      notes: p.notes,
      phase_total_rounds: p.phase_total_rounds,
      strings: p.strings.map((s) => {
        const extra: Record<string, string> = {};
        const out: CofPatchString = {
          row_type: s.row_type,
          string_number: s.string_number,
          option_label: s.option_label,
        };
        for (const [k, v] of Object.entries(s.values)) {
          if (isBuiltinColumn(k)) out[k] = v;
          else extra[k] = v;
        }
        if (Object.keys(extra).length) out.extra = extra;
        return out;
      }),
    })),
  };
}
