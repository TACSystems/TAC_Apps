"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export default function FileDrop({
  name = "file",
  accept,
  multiple = false,
  label = "Select File",
  prompt = "Drag a file here, or",
  hint,
  pasteImages = false,
  showSelected = true,
  disabled = false,
  busyText,
  inputRef,
  onFiles,
}: {
  name?: string;
  accept?: string;
  multiple?: boolean;
  label?: string;
  prompt?: string;
  hint?: string;
  pasteImages?: boolean;
  showSelected?: boolean;
  disabled?: boolean;
  busyText?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFiles?: (files: File[]) => void;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const zoneRef = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function take(list: FileList | File[] | null | undefined) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const input = ref.current;
    if (input) {
      const dt = new DataTransfer();
      chosen.forEach((f) => dt.items.add(f));
      input.files = dt.files;
    }
    setSelected(chosen.map((f) => f.name));
    onFiles?.(chosen);
  }

  useEffect(() => {
    if (!pasteImages || !active) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      take(
        files.map((f, i) => {
          const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
          const fresh = !f.name || f.name === "image.png" || f.name === `image.${ext}`;
          return fresh ? new File([f], `pasted-${stamp}${files.length > 1 ? `-${i + 1}` : ""}.${ext}`, { type: f.type }) : f;
        })
      );
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  return (
    <div className="flex max-w-2xl flex-col gap-1">
      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        aria-label={label}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(document.activeElement === zoneRef.current)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) take(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-5 text-center text-sm outline-none transition-colors ${
          over ? "border-brand-amber bg-brand-tile" : "border-neutral-700 bg-neutral-950 hover:border-neutral-500 focus:border-brand-amber"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {busyText ? (
          <span className="text-brand-amber">{busyText}</span>
        ) : (
          <>
            <span className="text-neutral-400">
              {prompt}
              {pasteImages ? " paste an image, or" : ""}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => ref.current?.click()}
              className="btn btn-secondary"
            >
              {label}
            </button>
            {showSelected && selected.length > 0 && (
              <span className="max-w-full truncate text-xs text-neutral-300">
                {selected.length === 1 ? selected[0] : `${selected.length} files selected`}
              </span>
            )}
          </>
        )}
        <input
          ref={ref}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setSelected(files.map((f) => f.name));
            if (files.length) onFiles?.(files);
          }}
        />
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
