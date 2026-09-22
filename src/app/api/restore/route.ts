import { lockedResponse } from "@/lib/api-guard";
import { NextRequest, NextResponse } from "next/server";
import { restoreBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a backup file first." }, { status: 400 });
  }
  try {
    const result = restoreBackup(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Restore failed." }, { status: 400 });
  }
}
