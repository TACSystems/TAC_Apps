import type Database from "better-sqlite3-multiple-ciphers";
import { firearmLabel, formatDate, type DateFormat, type FirearmLabelMode, type LabelledFirearm } from "./settings-shared";

declare global {
  var __taclogLabelMode: FirearmLabelMode | undefined;
  var __taclogDateFormat: DateFormat | undefined;
}

export function dateFormat(): DateFormat {
  return global.__taclogDateFormat ?? "us";
}

export function setDateFormat(f: DateFormat) {
  global.__taclogDateFormat = f;
}

export function fd(value: string | null | undefined) {
  return formatDate(value, dateFormat());
}

export function labelMode(): FirearmLabelMode {
  return global.__taclogLabelMode ?? "both";
}

export function setLabelMode(mode: FirearmLabelMode) {
  global.__taclogLabelMode = mode;
}

export function label(f: LabelledFirearm | null | undefined) {
  return firearmLabel(f, labelMode());
}

export function registerLabelFunction(db: Database.Database) {
  db.function("firearm_label", { deterministic: false }, (makeModel: unknown, nickname: unknown) => {
    if (makeModel === null || makeModel === undefined) return null;
    return firearmLabel({ make_model: String(makeModel), nickname: nickname == null ? null : String(nickname) }, labelMode());
  });
}
