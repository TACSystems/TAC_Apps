import { lockedResponse } from "@/lib/api-guard";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyCofPatch, type CofPatch } from "@core/lib/cof";

export async function POST(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let patch: CofPatch;
  try {
    const text = await file.text();
    patch = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "That file isn't valid JSON" }, { status: 400 });
  }

  if (!patch || !Array.isArray(patch.courses)) {
    return NextResponse.json(
      { error: "Expected a JSON object with a top-level \"courses\" array" },
      { status: 400 }
    );
  }

  try {
    const result = applyCofPatch(getDb(), patch);
    return NextResponse.json({ ok: true, coursesUpserted: result.coursesUpserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
