import { formatDate, formatDateTime, type DateFormat } from "./settings-shared";

declare global {
  var __tacqualDateFormat: DateFormat | undefined;
}

export function dateFormat(): DateFormat {
  return global.__tacqualDateFormat ?? "us";
}

export function setDateFormat(f: DateFormat) {
  global.__tacqualDateFormat = f;
}

export function fd(value: string | null | undefined) {
  return formatDate(value, dateFormat());
}

export function fdt(value: string | null | undefined) {
  return formatDateTime(value, dateFormat());
}
