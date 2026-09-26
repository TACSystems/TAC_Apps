import { NextRequest, NextResponse } from "next/server";
import { lockedResponse } from "@/lib/api-guard";
import { getDb } from "@/lib/db";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(search(getDb(), q), { headers: { "Cache-Control": "no-store" } });
}
