import { NextRequest, NextResponse } from "next/server";
import { lockedResponse } from "@/lib/api-guard";
import { getDb } from "@/lib/db";
import { toCsv } from "@/lib/xlsx";

export const dynamic = "force-dynamic";


const EXPORTS: Record<string, { headers: string[]; sql: string }> = {
  firearms: {
    headers: ["MAKE/MODEL", "CALIBER", "PLATFORM", "SERIAL NUMBER", "PURCHASE DATE", "PURCHASE LOCATION", "PURCHASE VALUE", "FFL LICENSE NUMBER", "RECEIPT", "STATUS", "SHOTS FIRED", "CLEAN EVERY ROUNDS", "CLEAN EVERY DAYS", "NOTES", "DATE OF ENTRY"],
    sql: `select make_model, caliber, platform, serial_number, purchase_date, purchase_location, purchase_value,
            ffl_license_number, receipt, status, shots_fired, clean_interval_rounds, clean_interval_days, notes, date_of_entry
          from firearms order by make_model`,
  },
  accessories: {
    headers: ["MAKE/MODEL", "TYPE", "PLATFORM", "SERIAL NUMBER", "ACQUISITION DATE", "PURCHASE VALUE", "PURCHASE LOCATION", "RECEIPT", "MOUNTED ON"],
    sql: `select a.make_model, a.type, a.platform, a.serial_number, a.acquisition_date, a.purchase_value, a.purchase_location,
            a.receipt, f.make_model as mounted_on
          from accessories a left join firearms f on f.id = a.firearm_id order by a.make_model`,
  },
  ammo: {
    headers: ["MANUFACTURER", "AMMO TYPE", "CALIBER", "GRAIN", "LOT NUMBER", "QUANTITY", "DATE PURCHASED", "PRICE"],
    sql: `select manufacturer, ammo_type, caliber, grain, lot_number, quantity, date_purchased, price
          from ammo_purchases order by date_purchased desc`,
  },
  "range-sessions": {
    headers: ["DATE", "COURSE", "COURSE CODE", "FIREARM", "CALIBER", "AMMO LOT", "RANGE LOCATION", "WEATHER", "ROUNDS FIRED", "ROUNDS COUNTED", "TOTAL POINTS", "FINAL SCORE %", "PASSING %", "RESULT", "GRADER", "NOTES"],
    sql: `select r.date, c.name, c.code, coalesce(f.make_model, r.weapon_used), r.caliber, r.ammo_lot, r.range_location,
            r.weather_conditions, r.rounds_fired, r.rounds_counted, r.total_points, r.final_score_percent, r.passing_score_percent,
            case when r.passing_score_percent is null or r.final_score_percent is null then null
                 when r.final_score_percent >= r.passing_score_percent then 'PASS' else 'FAIL' end,
            r.grader_name, r.notes
          from range_log r left join courses_of_fire c on c.id = r.cof_id left join firearms f on f.id = r.firearm_id
          order by r.date desc`,
  },
  "rounds-fired": {
    headers: ["DATE", "FIREARM", "ROUNDS", "CALIBER", "AMMO LOT", "DEDUCTED FROM AMMO", "NOTES"],
    sql: `select r.date, f.make_model, r.rounds, r.caliber, r.ammo_lot, case when r.deduct_from_ammo = 1 then 'YES' else 'NO' end, r.notes
          from rounds_fired_log r left join firearms f on f.id = r.firearm_id order by r.date desc`,
  },
  maintenance: {
    headers: ["DATE", "FIREARM", "TYPE", "ROUND COUNT", "NOTES"],
    sql: `select m.date, f.make_model, m.type, m.shots_fired_at_time, m.notes
          from maintenance_log m join firearms f on f.id = m.firearm_id order by m.date desc`,
  },
};

export async function GET(req: NextRequest) {
  const locked = await lockedResponse();
  if (locked) return locked;
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const spec = EXPORTS[type];
  if (!spec) return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  const rows = getDb().prepare(spec.sql).raw().all() as (string | number | null)[][];
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(spec.headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="TAC-LOG-${type}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

