"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { saveTargetType, type ZoneDef } from "@/lib/cof";

export async function saveTargetTypeAction(payload: {
  id?: string | null;
  name: string;
  description: string | null;
  zones: ZoneDef[];
}): Promise<{ error: string } | { id: string }> {
  try {
    const id = saveTargetType(getDb(), {
      id: payload.id || null,
      name: String(payload.name ?? ""),
      description: payload.description ? String(payload.description).trim() || null : null,
      zones: Array.isArray(payload.zones) ? payload.zones : [],
    });
    revalidatePath("/targets");
    revalidatePath("/courses");
    return { id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the target type." };
  }
}

export async function deleteTargetType(id: string) {
  const db = getDb();
  const used = (
    db.prepare(`select count(*) as n from courses_of_fire where target_type_id = ?`).get(id) as { n: number }
  ).n;
  if (used > 0) {
    redirect(`/targets/${id}?error=in-use`);
  }
  db.prepare(`delete from target_types where id = ?`).run(id);
  revalidatePath("/targets");
  redirect("/targets");
}
