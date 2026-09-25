import { upsertGoal } from "@/lib/ammo";
import type Database from "better-sqlite3-multiple-ciphers";
import { randomUUID } from "crypto";
import { excelDate, type Cell, type Sheet } from "@/lib/xlsx";
import { todayISO } from "@/lib/settings-shared";

const norm = (v: Cell) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[#:.]/g, "")
    .trim();

const EMPTY = new Set(["", "NO RECORD", "N/A", "NA", "NONE", "-", "--", "—", "UNKNOWN", "TBD"]);

function clean(v: Cell): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return EMPTY.has(s.toUpperCase()) ? null : s;
}

function num(v: Cell): number | null {
  if (typeof v === "number") return v;
  const s = clean(v);
  if (!s) return null;
  const n = Number(s.replace(/[$€£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function date(v: Cell): string | null {
  if (typeof v === "number") return v > 20000 && v < 80000 ? excelDate(v) : null;
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

type TableSpec<K extends string> = {
  required: string[][];
  columns: Record<K, string[]>;
};

const FIREARM_SPEC: TableSpec<
  | "make_model"
  | "caliber"
  | "platform"
  | "serial_number"
  | "purchase_date"
  | "purchase_location"
  | "purchase_value"
  | "ffl_license_number"
  | "receipt"
  | "status"
  | "shots_fired"
  | "notes"
> = {
  required: [["MAKE/MODEL", "MAKE MODEL", "FIREARM"], ["CALIBER"], ["SERIAL NUMBER", "SERIAL", "SN"]],
  columns: {
    make_model: ["MAKE/MODEL", "MAKE MODEL", "FIREARM"],
    caliber: ["CALIBER"],
    platform: ["PLATFORM"],
    serial_number: ["SERIAL NUMBER", "SERIAL", "SN"],
    purchase_date: ["PURCHASE DATE", "DATE PURCHASED"],
    purchase_location: ["PURCHASE LOCATION", "PURCHASED FROM"],
    purchase_value: ["PURCHASE VALUE", "PRICE", "VALUE"],
    ffl_license_number: ["FFL LICENSE NUMBER", "FFL LICENSE", "FFL"],
    receipt: ["RECEIPT"],
    status: ["STATUS"],
    shots_fired: ["SHOTS FIRED", "ROUNDS FIRED"],
    notes: ["NOTES"],
  },
};

const ACCESSORY_SPEC: TableSpec<
  | "make_model"
  | "type"
  | "platform"
  | "serial_number"
  | "acquisition_date"
  | "purchase_value"
  | "purchase_location"
  | "receipt"
  | "mounted_on"
> = {
  required: [["MAKE/MODEL", "MAKE MODEL"], ["TYPE"], ["ACQUISITION DATE", "SERIAL NUMBER"]],
  columns: {
    make_model: ["MAKE/MODEL", "MAKE MODEL"],
    type: ["TYPE"],
    platform: ["PLATFORM"],
    serial_number: ["SERIAL NUMBER", "SERIAL"],
    acquisition_date: ["ACQUISITION DATE", "PURCHASE DATE"],
    purchase_value: ["PURCHASE VALUE", "PRICE", "VALUE"],
    purchase_location: ["PURCHASE LOCATION"],
    receipt: ["RECEIPT"],
    mounted_on: ["MOUNTED ON", "LINKED FIREARM", "FIREARM"],
  },
};

const AMMO_SPEC: TableSpec<
  "manufacturer" | "ammo_type" | "caliber" | "grain" | "lot_number" | "quantity" | "date_purchased" | "price"
> = {
  required: [["MANUFACTURER"], ["QUANTITY", "QTY"]],
  columns: {
    manufacturer: ["MANUFACTURER"],
    ammo_type: ["AMMO TYPE", "TYPE"],
    caliber: ["CALIBER"],
    grain: ["GRAIN"],
    lot_number: ["LOT NUMBER", "LOT"],
    quantity: ["QUANTITY", "QTY"],
    date_purchased: ["DATE PURCHASED", "PURCHASE DATE", "DATE"],
    price: ["PRICE", "COST"],
  },
};

const GOAL_SPEC: TableSpec<"caliber" | "goal"> = {
  required: [["CALIBER"], ["GOAL"]],
  columns: { caliber: ["CALIBER"], goal: ["GOAL"] },
};

const SHOT_SPEC: TableSpec<"weapon" | "shots" | "malfunctions"> = {
  required: [["WEAPON"], ["SHOTS FIRED"]],
  columns: { weapon: ["WEAPON"], shots: ["SHOTS FIRED"], malfunctions: ["MALFUNCTIONS"] },
};

type Found<K extends string> = { sheet: string; rowIndex: number; cols: Record<K, number | undefined>; start: number };

function findTables<K extends string>(sheet: Sheet, spec: TableSpec<K>, exclude?: (header: string[]) => boolean): Found<K>[] {
  const out: Found<K>[] = [];
  sheet.rows.forEach((row, rowIndex) => {
    const header = Array.from(row, norm);
    if (exclude?.(header)) return;
    const firstReq = spec.required[0];
    header.forEach((h, start) => {
      if (!firstReq.includes(h)) return;
      let end = start + 1;
      while (end < header.length && header[end] !== "" && end - start < 24) end++;
      const window = header.slice(start, end);
      const findCol = (names: string[]) => {
        const i = window.findIndex((c) => names.includes(c));
        return i >= 0 ? start + i : undefined;
      };
      if (!spec.required.every((names) => findCol(names) !== undefined)) return;
      const cols = {} as Record<K, number | undefined>;
      for (const [k, names] of Object.entries(spec.columns) as [K, string[]][]) cols[k] = findCol(names);
      out.push({ sheet: sheet.name, rowIndex, cols, start });
    });
  });
  return out;
}

function readRows<K extends string>(sheet: Sheet, t: Found<K>, key: NoInfer<K>): Record<K, Cell>[] {
  const out: Record<K, Cell>[] = [];
  let blanks = 0;
  for (let r = t.rowIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    const keyCell = t.cols[key] !== undefined ? row[t.cols[key]!] : null;
    const headerAgain = norm(row[t.start] ?? null) === norm(sheet.rows[t.rowIndex]?.[t.start] ?? null);
    if (headerAgain) break;
    if (clean(keyCell ?? null) == null) {
      if (++blanks >= 3) break;
      continue;
    }
    blanks = 0;
    const rec = {} as Record<K, Cell>;
    for (const k of Object.keys(t.cols) as K[]) rec[k] = t.cols[k] !== undefined ? row[t.cols[k]!] ?? null : null;
    out.push(rec);
  }
  return out;
}

export type ImportPreview = {
  firearms: { make_model: string; serial: string | null; caliber: string | null; duplicate: boolean }[];
  accessories: { make_model: string; serial: string | null; type: string | null; duplicate: boolean }[];
  ammo: { caliber: string; manufacturer: string | null; quantity: number; duplicate: boolean }[];
  goals: { caliber: string; goal: number; existing: number | null; duplicate: boolean }[];
  shotCounts: number;
  warnings: string[];
  sheets: string[];
};

type Plan = {
  firearms: {
    make_model: string;
    caliber: string | null;
    platform: string | null;
    serial_number: string | null;
    purchase_date: string | null;
    purchase_location: string | null;
    purchase_value: number | null;
    ffl_license_number: string | null;
    receipt: string | null;
    status: string;
    shots_fired: number;
    malfunctions: number;
    notes: string | null;
    duplicate: boolean;
  }[];
  accessories: {
    make_model: string;
    type: string | null;
    platform: string | null;
    serial_number: string | null;
    acquisition_date: string | null;
    purchase_value: number | null;
    purchase_location: string | null;
    receipt: string | null;
    mounted_on: string | null;
    duplicate: boolean;
  }[];
  ammo: {
    manufacturer: string | null;
    ammo_type: string | null;
    caliber: string;
    grain: number | null;
    lot_number: string | null;
    quantity: number;
    date_purchased: string | null;
    price: number | null;
    duplicate: boolean;
  }[];
  goals: { caliber: string; goal: number; existing: number | null; duplicate: boolean }[];
  shotCounts: number;
  warnings: string[];
  sheets: string[];
};

export function planImport(db: Database.Database, sheets: Sheet[]): Plan {
  const plan: Plan = { firearms: [], accessories: [], ammo: [], goals: [], shotCounts: 0, warnings: [], sheets: sheets.map((s) => s.name) };
  const serialsTaken = new Set(
    (db.prepare(`select upper(serial_number) as s from firearms where serial_number is not null`).all() as { s: string }[]).map((r) => r.s)
  );
  const accSerials = new Set(
    (db.prepare(`select upper(serial_number) as s from accessories where serial_number is not null`).all() as { s: string }[]).map((r) => r.s)
  );
  const firearmKeys = new Set(
    (db.prepare(`select upper(make_model) || '|' || coalesce(purchase_date,'') as k from firearms`).all() as { k: string }[]).map((r) => r.k)
  );
  const accKeys = new Set((db.prepare(`select upper(make_model) as k from accessories where serial_number is null`).all() as { k: string }[]).map((r) => r.k));
  const ammoKeys = new Set(
    (
      db
        .prepare(
          `select coalesce(upper(manufacturer),'') || '|' || upper(caliber) || '|' || quantity || '|' || coalesce(date_purchased,'') || '|' || coalesce(price,'') as k from ammo_purchases`
        )
        .all() as { k: string }[]
    ).map((r) => r.k)
  );

  const shotMap = new Map<string, { shots: number; malfunctions: number }>();

  for (const sheet of sheets) {
    for (const t of findTables(sheet, SHOT_SPEC)) {
      for (const r of readRows(sheet, t, "weapon")) {
        const w = clean(r.weapon);
        if (w) shotMap.set(w.toUpperCase(), { shots: num(r.shots) ?? 0, malfunctions: num(r.malfunctions) ?? 0 });
      }
    }
  }

  for (const sheet of sheets) {
    for (const t of findTables(sheet, FIREARM_SPEC, (h) => h.includes("TYPE") && h.includes("ACQUISITION DATE"))) {
      for (const r of readRows(sheet, t, "make_model")) {
        const make_model = clean(r.make_model);
        if (!make_model) continue;
        const serial = clean(r.serial_number);
        const pd = date(r.purchase_date);
        const duplicate = serial ? serialsTaken.has(serial.toUpperCase()) : firearmKeys.has(`${make_model.toUpperCase()}|${pd ?? ""}`);
        if (serial) serialsTaken.add(serial.toUpperCase());
        const status = (clean(r.status) ?? "active").toLowerCase();
        const shot = shotMap.get(make_model.toUpperCase());
        if (shot) plan.shotCounts += 1;
        plan.firearms.push({
          make_model,
          caliber: clean(r.caliber),
          platform: clean(r.platform),
          serial_number: serial,
          purchase_date: pd,
          purchase_location: clean(r.purchase_location),
          purchase_value: num(r.purchase_value),
          ffl_license_number: clean(r.ffl_license_number),
          receipt: clean(r.receipt),
          status: ["active", "stored", "sold"].includes(status) ? status : "active",
          shots_fired: num(r.shots_fired) ?? shot?.shots ?? 0,
          malfunctions: shot?.malfunctions ?? 0,
          notes: clean(r.notes),
          duplicate,
        });
      }
    }

    for (const t of findTables(sheet, ACCESSORY_SPEC, (h) => h.includes("CALIBER"))) {
      for (const r of readRows(sheet, t, "make_model")) {
        const make_model = clean(r.make_model);
        if (!make_model) continue;
        const serial = clean(r.serial_number);
        const duplicate = serial ? accSerials.has(serial.toUpperCase()) : accKeys.has(make_model.toUpperCase());
        if (serial) accSerials.add(serial.toUpperCase());
        plan.accessories.push({
          make_model,
          type: clean(r.type),
          platform: clean(r.platform),
          serial_number: serial,
          acquisition_date: date(r.acquisition_date),
          purchase_value: num(r.purchase_value),
          purchase_location: clean(r.purchase_location),
          receipt: clean(r.receipt),
          mounted_on: clean(r.mounted_on),
          duplicate,
        });
      }
    }

    for (const t of findTables(sheet, AMMO_SPEC)) {
      if (t.cols.caliber === undefined) {
        plan.warnings.push(
          `"${sheet.name}" ammo table has no CALIBER column, so those purchases are imported as caliber "Unspecified". Edit them on the Ammo page afterward.`
        );
      }
      for (const r of readRows(sheet, t, "quantity")) {
        const quantity = num(r.quantity);
        if (!quantity) continue;
        const caliber = clean(r.caliber) ?? "Unspecified";
        const manufacturer = clean(r.manufacturer);
        const dp = date(r.date_purchased);
        const price = num(r.price);
        const key = `${(manufacturer ?? "").toUpperCase()}|${caliber.toUpperCase()}|${quantity}|${dp ?? ""}|${price ?? ""}`;
        const duplicate = ammoKeys.has(key);
        ammoKeys.add(key);
        plan.ammo.push({
          manufacturer,
          ammo_type: clean(r.ammo_type),
          caliber,
          grain: num(r.grain),
          lot_number: clean(r.lot_number),
          quantity,
          date_purchased: dp,
          price,
          duplicate,
        });
      }
    }

    for (const t of findTables(sheet, GOAL_SPEC)) {
      for (const r of readRows(sheet, t, "caliber")) {
        const caliber = clean(r.caliber);
        const goal = num(r.goal);
        if (!caliber || !goal || goal <= 0) continue;
        const existing = db.prepare(`select goal_quantity from ammo_goals where caliber = ? and ammo_type is null and grain is null`).get(caliber) as
          | { goal_quantity: number }
          | undefined;
        if (!plan.goals.some((g) => g.caliber === caliber)) {
          plan.goals.push({
            caliber,
            goal,
            existing: existing?.goal_quantity ?? null,
            duplicate: existing?.goal_quantity === goal,
          });
        }
      }
    }
  }

  if (!plan.firearms.length && !plan.accessories.length && !plan.ammo.length && !plan.goals.length) {
    plan.warnings.push(
      "No recognizable tables were found. TAC-LOG looks for header rows like MAKE/MODEL, CALIBER, SERIAL NUMBER (firearms), MAKE/MODEL, TYPE, ACQUISITION DATE (accessories), or MANUFACTURER, QUANTITY (ammo)."
    );
  }
  return plan;
}

export function previewOf(plan: Plan): ImportPreview {
  return {
    firearms: plan.firearms.map((f) => ({ make_model: f.make_model, serial: f.serial_number, caliber: f.caliber, duplicate: f.duplicate })),
    accessories: plan.accessories.map((a) => ({ make_model: a.make_model, serial: a.serial_number, type: a.type, duplicate: a.duplicate })),
    ammo: plan.ammo.map((a) => ({ caliber: a.caliber, manufacturer: a.manufacturer, quantity: a.quantity, duplicate: a.duplicate })),
    goals: plan.goals,
    shotCounts: plan.shotCounts,
    warnings: plan.warnings,
    sheets: plan.sheets,
  };
}

export function commitImport(db: Database.Database, plan: Plan) {
  const today = todayISO();
  const counts = { firearms: 0, accessories: 0, ammo: 0, goals: 0 };
  db.transaction(() => {
    const insF = db.prepare(
      `insert into firearms (id, make_model, caliber, platform, serial_number, purchase_date, purchase_location,
         purchase_value, ffl_license_number, receipt, status, shots_fired, malfunctions, notes)
       values (@id, @make_model, @caliber, @platform, @serial_number, @purchase_date, @purchase_location,
         @purchase_value, @ffl_license_number, @receipt, @status, @shots_fired, @malfunctions, @notes)`
    );
    for (const f of plan.firearms) {
      if (f.duplicate) continue;
      const { duplicate: _d, ...row } = f;
      void _d;
      insF.run({ id: randomUUID(), ...row });
      counts.firearms++;
    }
    const findFirearm = db.prepare(`select id, make_model from firearms where upper(make_model) = upper(?) order by date_of_entry desc limit 1`);
    const insA = db.prepare(
      `insert into accessories (id, firearm_id, make_model, type, platform, serial_number, acquisition_date,
         purchase_value, purchase_location, receipt)
       values (@id, @firearm_id, @make_model, @type, @platform, @serial_number, @acquisition_date,
         @purchase_value, @purchase_location, @receipt)`
    );
    const insMount = db.prepare(
      `insert into accessory_mounts (id, accessory_id, firearm_id, firearm_label, from_date) values (?, ?, ?, ?, ?)`
    );
    for (const a of plan.accessories) {
      if (a.duplicate) continue;
      const fa = a.mounted_on ? (findFirearm.get(a.mounted_on) as { id: string; make_model: string } | undefined) : undefined;
      const id = randomUUID();
      const { duplicate: _d, mounted_on: _m, ...row } = a;
      void _d;
      void _m;
      insA.run({ id, firearm_id: fa?.id ?? null, ...row });
      if (fa) insMount.run(randomUUID(), id, fa.id, fa.make_model, a.acquisition_date ?? today);
      counts.accessories++;
    }
    const insAmmo = db.prepare(
      `insert into ammo_purchases (id, manufacturer, ammo_type, caliber, grain, lot_number, quantity, date_purchased, price)
       values (@id, @manufacturer, @ammo_type, @caliber, @grain, @lot_number, @quantity, @date_purchased, @price)`
    );
    for (const a of plan.ammo) {
      if (a.duplicate) continue;
      const { duplicate: _d, ...row } = a;
      void _d;
      insAmmo.run({ id: randomUUID(), ...row });
      counts.ammo++;
    }
    for (const g of plan.goals) {
      if (g.duplicate) continue;
      upsertGoal(db, { caliber: g.caliber, ammo_type: null, grain: null, goal: g.goal });
      counts.goals++;
    }
  })();
  return counts;
}
