import { lockedResponse } from "@/lib/api-guard";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { openFile } from "@/lib/security-state";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const { path: segments } = await params;
  const dataDir = process.env.FIREARMS_DB_DIR || path.join(process.cwd(), "data");
  const base = path.resolve(path.join(dataDir, "receipts"));
  const target = path.resolve(path.join(base, ...segments));

  if (target !== base && !target.startsWith(base + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(target).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const buffer = openFile(fs.readFileSync(target));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
