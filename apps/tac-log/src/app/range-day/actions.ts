"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { decodePick } from "@/lib/ammo";
import { assignEntry } from "@/lib/sessions";

export type DayRow = {
  firearmId: string;
  rounds: number;
  caliber: string;
  ammo: string;
  ammoLot: string;
  deduct: boolean;
  courseId: string;
  score: string;
  notes: string;
};

export type DayHeader = { date: string; location: string; weather: string; shooter: string; notes: string };

export async function saveRangeDay(header: DayHeader, rows: DayRow[]): Promise<{ ok: boolean; error?: string; saved?: number; sessions?: number; sessionId?: string | null }> {
  const db = getDb();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(header?.date)) ? header.date : null;
  if (!date) return { ok: false, error: "Pick the date of the trip." };
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && r.firearmId && Number(r.rounds) > 0);
  if (!list.length) return { ok: false, error: "Add at least one firearm with rounds fired." };
  const t = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? s.slice(0, 200) : null;
  };
  let sessions = 0;
  let sessionId: string | null = null;
  db.transaction(() => {
    for (const r of list) {
      const f = db.prepare(`select caliber from firearms where id = ?`).get(r.firearmId) as { caliber: string | null } | undefined;
      if (!f) continue;
      const rounds = Math.round(Number(r.rounds));
      const pick = decodePick(r.ammo);
      const caliber = pick?.caliber ?? t(r.caliber) ?? f.caliber;
      const id = randomUUID();
      const notes = t(r.notes);
      if (r.courseId) {
        const c = db.prepare(`select passing_score_percent from courses_of_fire where id = ?`).get(r.courseId) as
          | { passing_score_percent: number | null }
          | undefined;
        const score = r.score !== "" && Number.isFinite(Number(r.score)) ? Math.max(0, Math.min(100, Number(r.score))) : null;
        db.prepare(
          `insert into range_log (id, cof_id, firearm_id, date, range_location, caliber, grain, ammo_lot, weather_conditions,
             rounds_fired, final_score_percent, passing_score_percent, custom_fields_json, notes,
             ammo_type, ammo_grain, ammo_manufacturer)
           values (@id, @cof_id, @firearm_id, @date, @range_location, @caliber, @grain, @ammo_lot, @weather,
             @rounds, @score, @passing, @custom, @notes, @ammo_type, @ammo_grain, @ammo_manufacturer)`
        ).run({
          id,
          grain: pick?.grain ?? null,
          ammo_type: pick?.ammo_type ?? null,
          ammo_grain: pick?.grain ?? null,
          ammo_manufacturer: pick?.manufacturer ?? null,
          cof_id: c ? r.courseId : null,
          firearm_id: r.firearmId,
          date,
          range_location: t(header.location),
          caliber,
          ammo_lot: t(r.ammoLot),
          weather: t(header.weather),
          rounds,
          score,
          passing: c?.passing_score_percent ?? null,
          custom: t(header.shooter) ? JSON.stringify({ shooter_name: t(header.shooter) }) : null,
          notes,
        });
        sessionId = assignEntry(db, "range_log", id);
        sessions += 1;
      } else {
        db.prepare(
          `insert into rounds_fired_log (id, firearm_id, date, rounds, caliber, ammo_lot, deduct_from_ammo, notes,
             range_location, ammo_type, ammo_grain, ammo_manufacturer)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          r.firearmId,
          date,
          rounds,
          caliber,
          t(r.ammoLot),
          r.deduct ? 1 : 0,
          notes,
          t(header.location),
          pick?.ammo_type ?? null,
          pick?.grain ?? null,
          pick?.manufacturer ?? null
        );
        sessionId = assignEntry(db, "rounds_fired_log", id);
      }
      db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(rounds, r.firearmId);
    }
    const tripNotes = t(header.notes);
    if (sessionId && tripNotes) {
      db.prepare(
        `update range_sessions set notes = case when notes is null or notes = '' then ? when instr(notes, ?) > 0 then notes else notes || char(10) || ? end where id = ?`
      ).run(tripNotes, tripNotes, tripNotes, sessionId);
    }
  })();
  revalidatePath("/", "layout");
  return { ok: true, saved: list.length, sessions, sessionId };
}
