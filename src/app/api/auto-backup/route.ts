import { NextResponse } from "next/server";
import { runAutoBackupIfDue } from "@/lib/auto-backup";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(runAutoBackupIfDue());
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "failed" });
  }
}
