import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { closeDb, dataDir, getDb } from "@/lib/db";
import { createZip, readZip, type ZipEntry } from "@/lib/zip";

const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000", "latin1");

function walk(dir: string, base: string, out: ZipEntry[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = `${base}/${entry.name}`;
    if (entry.isDirectory()) walk(full, rel, out);
    else if (entry.isFile()) out.push({ name: rel, data: fs.readFileSync(full) });
  }
}

export function createBackup(): { buffer: Buffer; receiptCount: number } {
  const db = getDb();
  const snapshot = db.serialize();
  const receipts: ZipEntry[] = [];
  walk(path.join(dataDir(), "receipts"), "receipts", receipts);
  const manifest = {
    app: "TAC-LOG",
    format: 1,
    created: new Date().toISOString(),
    version: process.env.TAC_LOG_VERSION ?? null,
    receipts: receipts.length,
  };
  const buffer = createZip([
    { name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2)) },
    { name: "firearms.db", data: Buffer.from(snapshot) },
    ...receipts,
  ]);
  return { buffer, receiptCount: receipts.length };
}

function validateDatabase(file: string) {
  let check: Database.Database | null = null;
  try {
    check = new Database(file, { readonly: true, fileMustExist: true });
    const tables = new Set(
      (check.prepare(`select name from sqlite_master where type = 'table'`).all() as { name: string }[]).map(
        (t) => t.name
      )
    );
    if (!tables.has("firearms") || !tables.has("courses_of_fire")) {
      throw new Error("That file isn't a TAC-LOG database.");
    }
    const integrity = check.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error("That backup's database failed its integrity check.");
  } finally {
    check?.close();
  }
}

export function restoreBackup(buf: Buffer): { receiptCount: number | null; safetyFolder: string } {
  const dir = dataDir();
  let dbBytes: Buffer;
  let receipts: ZipEntry[] | null = null;

  if (buf.subarray(0, 4).toString("latin1") === "PK\u0003\u0004") {
    const entries = readZip(buf);
    const dbEntry = entries.find((e) => e.name === "firearms.db");
    if (!dbEntry) throw new Error("That zip doesn't contain a TAC-LOG database.");
    dbBytes = dbEntry.data;
    receipts = entries.filter((e) => e.name.startsWith("receipts/"));
    for (const r of receipts) {
      const parts = r.name.split("/");
      if (parts.some((p) => p === ".." || p === "" || p.includes("\\")) || parts.length !== 3) {
        throw new Error("Backup contains an unexpected file path. Nothing was restored.");
      }
    }
  } else if (buf.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
    dbBytes = buf;
  } else {
    throw new Error("Choose a TAC-LOG backup (.zip) or database (.db) file.");
  }

  const tmp = path.join(dir, `restore-${Date.now()}.tmp.db`);
  fs.writeFileSync(tmp, dbBytes);
  try {
    validateDatabase(tmp);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safety = path.join(dir, "pre-restore", stamp);
  fs.mkdirSync(safety, { recursive: true });

  closeDb();
  const live = path.join(dir, "firearms.db");
  if (fs.existsSync(live)) fs.renameSync(live, path.join(safety, "firearms.db"));
  fs.rmSync(`${live}-wal`, { force: true });
  fs.rmSync(`${live}-shm`, { force: true });
  fs.renameSync(tmp, live);

  if (receipts) {
    const receiptsDir = path.join(dir, "receipts");
    if (fs.existsSync(receiptsDir)) fs.renameSync(receiptsDir, path.join(safety, "receipts"));
    for (const r of receipts) {
      const target = path.join(dir, ...r.name.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, r.data);
    }
  }

  getDb();
  return { receiptCount: receipts ? receipts.length : null, safetyFolder: safety };
}
