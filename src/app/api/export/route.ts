import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataDir = process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "firearms.db");

  if (!fs.existsSync(dbPath)) {
    return new NextResponse("No database file found yet.", { status: 404 });
  }

  const buffer = fs.readFileSync(dbPath);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="tac-log-backup-${stamp}.db"`,
      "Cache-Control": "no-store",
    },
  });
}
