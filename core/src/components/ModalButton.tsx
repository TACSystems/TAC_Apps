"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ModalButton({
  label,
  title,
  children,
  initialOpen = false,
  primary = false,
  wide = false,
}: {
  label: string;
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  primary?: boolean;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          primary
            ? "btn btn-primary"
            : "btn btn-secondary"
        }
      >
        {label}
      </button>
      <div
        className={`fixed inset-0 z-[70] items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16 print:hidden ${open ? "flex" : "hidden"}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} border border-brand-amber bg-neutral-900 p-5 shadow-2xl`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm tracking-[0.15em] text-brand-amber">{title.toUpperCase()}</div>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-500 hover:text-neutral-200" aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
