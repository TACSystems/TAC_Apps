import type Database from "better-sqlite3";
import { randomUUID } from "crypto";

export type CofPatchString = {
  string_number: number;
  option_label: string | null;
  distance: string | null;
  weapon: string | null;
  rounds: string | number | null;
  time_limit: string | null;
  position: string | null;
  action: string | null;
};

export type CofPatchPhase = {
  phase_number: number;
  title: string;
  phase_total_rounds: number | null;
  strings: CofPatchString[];
};

export type CofPatchCourse = {
  code: string;
  name: string;
  total_rounds: number | null;
  target_type: string | null;
  notes?: string | null;
  phases: CofPatchPhase[];
  scoring_zones: { zone_label: string; value: number }[];
};

export type CofPatch = { courses: CofPatchCourse[] };

export function applyCofPatch(db: Database.Database, patch: CofPatch) {
  let coursesUpserted = 0;

  const upsertCourse = db.prepare(`
    insert into courses_of_fire (id, code, name, total_rounds, target_type, notes)
    values (@id, @code, @name, @total_rounds, @target_type, @notes)
    on conflict(code) do update set
      name = excluded.name,
      total_rounds = excluded.total_rounds,
      target_type = excluded.target_type,
      notes = excluded.notes
  `);

  const getCourseIdByCode = db.prepare(`select id from courses_of_fire where code = ?`);

  const upsertPhase = db.prepare(`
    insert into cof_phases (id, cof_id, phase_number, title, phase_total_rounds)
    values (@id, @cof_id, @phase_number, @title, @phase_total_rounds)
    on conflict(cof_id, phase_number) do update set
      title = excluded.title,
      phase_total_rounds = excluded.phase_total_rounds
  `);

  const getPhaseId = db.prepare(
    `select id from cof_phases where cof_id = ? and phase_number = ?`
  );

  const deleteStringsForPhase = db.prepare(`delete from cof_strings where phase_id = ?`);

  const insertString = db.prepare(`
    insert into cof_strings (id, phase_id, string_number, option_label, distance, weapon, rounds, time_limit, position, action)
    values (@id, @phase_id, @string_number, @option_label, @distance, @weapon, @rounds, @time_limit, @position, @action)
  `);

  const upsertZone = db.prepare(`
    insert into cof_scoring_zones (id, cof_id, zone_label, value)
    values (@id, @cof_id, @zone_label, @value)
    on conflict(cof_id, zone_label) do update set value = excluded.value
  `);

  const applyAll = db.transaction((courses: CofPatchCourse[]) => {
    for (const course of courses) {
      if (!course.code) continue;

      upsertCourse.run({
        id: randomUUID(),
        code: course.code,
        name: course.name,
        total_rounds: course.total_rounds,
        target_type: course.target_type,
        notes: course.notes ?? null,
      });
      coursesUpserted += 1;

      const cofRow = getCourseIdByCode.get(course.code) as { id: string };
      const cofId = cofRow.id;

      for (const phase of course.phases) {
        upsertPhase.run({
          id: randomUUID(),
          cof_id: cofId,
          phase_number: phase.phase_number,
          title: phase.title,
          phase_total_rounds: phase.phase_total_rounds,
        });

        const phaseRow = getPhaseId.get(cofId, phase.phase_number) as { id: string };
        const phaseId = phaseRow.id;

        // Strings are fully replaced per phase rather than diffed — simpler and
        // safe since strings carry no independent identity a user references elsewhere.
        deleteStringsForPhase.run(phaseId);
        for (const s of phase.strings) {
          insertString.run({
            id: randomUUID(),
            phase_id: phaseId,
            string_number: s.string_number,
            option_label: s.option_label,
            distance: s.distance,
            weapon: s.weapon,
            rounds: s.rounds == null ? null : String(s.rounds),
            time_limit: s.time_limit,
            position: s.position,
            action: s.action,
          });
        }
      }

      for (const zone of course.scoring_zones) {
        upsertZone.run({
          id: randomUUID(),
          cof_id: cofId,
          zone_label: zone.zone_label,
          value: zone.value,
        });
      }
    }
  });

  applyAll(patch.courses);

  return { coursesUpserted };
}
