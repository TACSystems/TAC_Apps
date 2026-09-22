import { NextResponse } from "next/server";
import { isUnlocked } from "@/lib/lock";

export async function lockedResponse(): Promise<NextResponse | null> {
  return (await isUnlocked()) ? null : new NextResponse("TAC-LOG is locked.", { status: 401 });
}
