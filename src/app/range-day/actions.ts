"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export type DayRow = {
  firearmId: string;
  rounds: number;
  caliber: string;
  ammoLot: string;
  deduct: boolean;
  courseId: string;
  score: string;
  notes: string;
};

export type DayHeader = { date: string; location: string; weather: string; shooter: string; notes: string };

export async function saveRangeDay(header: DayHeader, rows: DayRow[]): Promise<{ ok: boolean; error?: string; saved?: number; sessions?: number }> {
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
  db.transaction(() => {
    for (const r of list) {
      const f = db.prepare(`select caliber from firearms where id = ?`).get(r.firearmId) as { caliber: string | null } | undefined;
      if (!f) continue;
      const rounds = Math.round(Number(r.rounds));
      const caliber = t(r.caliber) ?? f.caliber;
      const notes = [t(header.notes), t(r.notes)].filter(Boolean).join(" · ") || null;
      if (r.courseId) {
        const c = db.prepare(`select passing_score_percent from courses_of_fire where id = ?`).get(r.courseId) as
          | { passing_score_percent: number | null }
          | undefined;
        const score = r.score !== "" && Number.isFinite(Number(r.score)) ? Math.max(0, Math.min(100, Number(r.score))) : null;
        db.prepare(
          `insert into range_log (id, cof_id, firearm_id, date, range_location, caliber, ammo_lot, weather_conditions,
             rounds_fired, final_score_percent, passing_score_percent, custom_fields_json, notes)
           values (@id, @cof_id, @firearm_id, @date, @range_location, @caliber, @ammo_lot, @weather,
             @rounds, @score, @passing, @custom, @notes)`
        ).run({
          id: randomUUID(),
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
        sessions += 1;
      } else {
        db.prepare(
          `insert into rounds_fired_log (id, firearm_id, date, rounds, caliber, ammo_lot, deduct_from_ammo, notes)
           values (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          randomUUID(),
          r.firearmId,
          date,
          rounds,
          caliber,
          t(r.ammoLot),
          r.deduct ? 1 : 0,
          [t(header.location) ? `Range Day at ${t(header.location)}` : "Range Day", notes].filter(Boolean).join(" · ")
        );
      }
      db.prepare(`update firearms set shots_fired = shots_fired + ? where id = ?`).run(rounds, r.firearmId);
    }
  })();
  revalidatePath("/", "layout");
  return { ok: true, saved: list.length, sessions };
}
