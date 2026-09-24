import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAutoBackup, runAutoBackupNow } from "@/lib/auto-backup";
import { isUnlocked } from "@/lib/security-state";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: "Unlock TAC-LOG first." });
  const db = getDb();
  if (!getAutoBackup(db).folder) return NextResponse.json({ ok: false, needsFolder: true });
  return NextResponse.json(runAutoBackupNow(db));
}
