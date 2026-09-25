"use client";

import { useState } from "react";

const OTHER = "__other__";

export default function SelectOrOther({
  name,
  options,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  options: string[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  const startsAsOther = !!defaultValue && !options.includes(defaultValue);
  const [mode, setMode] = useState<"select" | "other">(startsAsOther ? "other" : "select");

  if (mode === "other") {
    return (
      <div className="flex gap-2">
        <input
          name={name}
          autoFocus
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={() => setMode("select")}
          className="btn btn-secondary btn-xs shrink-0"
        >
          Choose from list
        </button>
      </div>
    );
  }

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue ?? ""}
      onChange={(e) => {
        if (e.target.value === OTHER) setMode("other");
      }}
      className="input"
    >
      <option value="">— Select —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value={OTHER}>Other (type your own)…</option>
    </select>
  );
}
