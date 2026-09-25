"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { adjustShots } from "@/lib/range-log";
import { cleanLocation, getSession, mergeSessions, moveEntry, pruneSessions, updateSession, type EntryTable } from "@/lib/sessions";

function refresh() {
  revalidatePath("/", "layout");
}

function exists(id: string) {
  return Boolean(getDb().prepare(`select 1 from range_sessions where id = ?`).get(id));
}

export async function saveSession(id: string, formData: FormData) {
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(`/range-log/session/${id}`);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;
  updateSession(getDb(), id, { date, location: cleanLocation(formData.get("location")), notes });
  refresh();
  redirect(`/range-log/session/${id}?done=saved-${Date.now()}`);
}

export async function mergeInto(id: string, formData: FormData) {
  const target = String(formData.get("target") ?? "");
  const db = getDb();
  if (!target || target === id || !getSession(db, target)) redirect(`/range-log/session/${id}`);
  mergeSessions(db, id, target);
  refresh();
  redirect(`/range-log/session/${target}?done=merged-${Date.now()}`);
}

export async function moveEntryAction(table: EntryTable, entryId: string, fromId: string, formData: FormData) {
  if (table !== "range_log" && table !== "rounds_fired_log") return;
  const target = String(formData.get("target") ?? "");
  if (!target || target === fromId) redirect(`/range-log/session/${fromId}`);
  const db = getDb();
  moveEntry(db, table, entryId, target);
  const row = db.prepare(`select session_id from ${table} where id = ?`).get(entryId) as { session_id: string } | undefined;
  refresh();
  if (exists(fromId)) redirect(`/range-log/session/${fromId}?done=moved-${Date.now()}`);
  redirect(`/range-log/session/${row?.session_id ?? ""}`);
}

export async function deletePractice(entryId: string, sessionId: string) {
  const db = getDb();
  const e = db.prepare(`select firearm_id, rounds from rounds_fired_log where id = ?`).get(entryId) as
    | { firearm_id: string | null; rounds: number }
    | undefined;
  if (e) {
    db.transaction(() => {
      db.prepare(`delete from rounds_fired_log where id = ?`).run(entryId);
      adjustShots(db, e.firearm_id, -e.rounds);
      pruneSessions(db);
    })();
  }
  refresh();
  if (exists(sessionId)) redirect(`/range-log/session/${sessionId}`);
  redirect("/range-log");
}

export async function deleteSession(id: string) {
  const db = getDb();
  db.transaction(() => {
    const runs = db.prepare(`select id, firearm_id, rounds_fired from range_log where session_id = ?`).all(id) as {
      id: string;
      firearm_id: string | null;
      rounds_fired: number | null;
    }[];
    for (const r of runs) {
      db.prepare(`delete from range_log where id = ?`).run(r.id);
      adjustShots(db, r.firearm_id, -(r.rounds_fired ?? 0));
    }
    const practice = db.prepare(`select id, firearm_id, rounds from rounds_fired_log where session_id = ?`).all(id) as {
      id: string;
      firearm_id: string | null;
      rounds: number;
    }[];
    for (const p of practice) {
      db.prepare(`delete from rounds_fired_log where id = ?`).run(p.id);
      adjustShots(db, p.firearm_id, -p.rounds);
    }
    db.prepare(`delete from range_sessions where id = ?`).run(id);
  })();
  refresh();
  redirect("/range-log");
}
