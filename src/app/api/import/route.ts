import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { lockedResponse } from "@/lib/api-guard";
import { getDb } from "@/lib/db";
import { parseCsv, parseXlsx, type Sheet } from "@/lib/xlsx";
import { commitImport, planImport, previewOf } from "@/lib/import-sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a spreadsheet first." }, { status: 400 });
  }
  let sheets: Sheet[];
  try {
    if (/\.csv$/i.test(file.name)) {
      sheets = [{ name: file.name, rows: parseCsv(await file.text()) }];
    } else if (/\.xlsx$/i.test(file.name)) {
      sheets = parseXlsx(Buffer.from(await file.arrayBuffer()));
    } else {
      return NextResponse.json(
        { error: "Use an Excel workbook (.xlsx) or a CSV file. Older .xls files: open in Excel and Save As .xlsx first." },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't read that file." }, { status: 400 });
  }

  const db = getDb();
  const plan = planImport(db, sheets);
  if (mode === "preview") return NextResponse.json({ ok: true, preview: previewOf(plan) });

  const counts = commitImport(db, plan);
  for (const p of ["/", "/inventory", "/inventory/accessories", "/ammo", "/stats"]) revalidatePath(p);
  return NextResponse.json({ ok: true, counts });
}
