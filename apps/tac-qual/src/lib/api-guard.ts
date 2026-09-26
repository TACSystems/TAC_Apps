import { NextResponse } from "next/server";
import { isUnlocked } from "@/lib/security-state";

export async function lockedResponse(): Promise<NextResponse | null> {
  return isUnlocked() ? null : new NextResponse("TAC-QUAL is locked.", { status: 401 });
}
