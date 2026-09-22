import { lockedResponse } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { createBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const locked = await lockedResponse();
  if (locked) return locked;
  const { buffer } = createBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="TAC-LOG-backup-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
