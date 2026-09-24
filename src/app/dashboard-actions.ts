"use server";

import { getDb } from "@/lib/db";
import { getSettings, updateSettings } from "@/lib/settings";

export async function saveDashboardSection(id: string, open: boolean) {
  const db = getDb();
  const current = new Set(getSettings(db).dashboardCollapsed);
  if (open) current.delete(String(id));
  else current.add(String(id));
  updateSettings(db, { dashboardCollapsed: [...current] });
}

export async function saveDashboardAll(ids: string[], open: boolean) {
  const db = getDb();
  updateSettings(db, { dashboardCollapsed: open ? [] : (Array.isArray(ids) ? ids : []).map(String).filter(Boolean) });
}
