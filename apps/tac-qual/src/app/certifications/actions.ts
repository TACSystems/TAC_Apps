"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { flash } from "@core/lib/flash";
import { deleteCertification, saveCertification, type CertificationInput } from "@/lib/certifications";

function validate(payload: unknown): { error: string } | { input: CertificationInput } {
  if (typeof payload !== "object" || payload === null) return { error: "Nothing to save." };
  const p = payload as Record<string, unknown>;
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return { error: "A certification needs a name." };
  const cofIds = Array.isArray(p.cofIds) ? p.cofIds.filter((x): x is string => typeof x === "string") : [];
  if (cofIds.length === 0) return { error: "Pick at least one course of fire." };
  if (new Set(cofIds).size !== cofIds.length) return { error: "The same course is listed twice." };
  const str = (k: string) => {
    const v = p[k];
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  return {
    input: {
      id: typeof p.id === "string" && p.id ? p.id : undefined,
      name,
      code: str("code"),
      description: str("description"),
      certificate_title: str("certificate_title"),
      certificate_body: str("certificate_body"),
      cofIds,
    },
  };
}

export async function saveCertificationAction(payload: unknown): Promise<{ error: string } | { id: string }> {
  const checked = validate(payload);
  if ("error" in checked) return { error: checked.error };
  try {
    const id = saveCertification(getDb(), checked.input);
    revalidatePath("/certifications");
    revalidatePath(`/certifications/${id}`);
    revalidatePath("/records/currency");
    return { id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't save the certification.";
    return { error: /unique/i.test(msg) ? "Another certification already uses that name." : msg };
  }
}

export async function deleteCertificationAction(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  const issued = (
    db.prepare(`select count(*) as n from certificates where certification_id = ?`).get(id) as { n: number }
  ).n;
  if (issued > 0) {
    await flash(
      `That certification has ${issued} certificate${issued === 1 ? "" : "s"} issued against it and can't be deleted.`,
      "error"
    );
    redirect(`/certifications/${id}`);
  }
  deleteCertification(db, id);
  await flash("Certification deleted.");
  revalidatePath("/certifications");
  redirect("/certifications");
}
