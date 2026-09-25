"use server";

import { getDb } from "@/lib/db";
import { setPageSections } from "@core/lib/page-sections";

export async function savePageSection(scope: string, id: string, open: boolean) {
  setPageSections(getDb(), String(scope), [String(id)], Boolean(open));
}

export async function savePageSectionsAll(scope: string, ids: string[], open: boolean) {
  setPageSections(getDb(), String(scope), (Array.isArray(ids) ? ids : []).map(String), Boolean(open));
}
