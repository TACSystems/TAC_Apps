"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  deleteAttachment,
  ownerPath,
  saveAttachment,
  type AttachmentKind,
  type OwnerType,
} from "@/lib/attachments";

const OWNER_TYPES: OwnerType[] = ["firearm", "accessory", "document"];
const KINDS: AttachmentKind[] = ["receipt", "photo", "bill_of_sale", "document"];

export async function uploadAttachment(
  ownerType: OwnerType,
  ownerId: string,
  kind: AttachmentKind,
  formData: FormData
) {
  if (!OWNER_TYPES.includes(ownerType) || !KINDS.includes(kind)) return;
  const db = getDb();
  const table = ownerType === "firearm" ? "firearms" : ownerType === "document" ? "documents" : "accessories";
  if (!db.prepare(`select 1 from ${table} where id = ?`).get(ownerId)) return;
  for (const file of formData.getAll("file")) {
    if (file instanceof File && file.size > 0) await saveAttachment(db, ownerType, ownerId, kind, file);
  }
  revalidatePath(ownerPath(ownerType, ownerId));
  revalidatePath("/reports/inventory");
}

export async function removeAttachment(id: string) {
  const row = deleteAttachment(getDb(), id);
  if (row) revalidatePath(ownerPath(row.owner_type, row.owner_id));
  revalidatePath("/reports/inventory");
}
