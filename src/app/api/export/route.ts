import { lockedResponse } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { createBackup } from "@/lib/backup";
import { todayISO } from "@/lib/settings-shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const locked = await lockedResponse();
  if (locked) return locked;
  let result;
  try {
    result = createBackup();
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "Backup failed.", { status: 400 });
  }
  const { buffer, encrypted } = result;
  const stamp = todayISO();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": encrypted ? "application/octet-stream" : "application/zip",
      "Content-Disposition": `attachment; filename="TAC-LOG-backup-${stamp}.${encrypted ? "tlbak" : "zip"}"`,
      "Cache-Control": "no-store",
    },
  });
}
