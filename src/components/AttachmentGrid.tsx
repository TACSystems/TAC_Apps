"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export type GridItem = {
  id: string;
  url: string;
  isImage: boolean;
  name: string;
  date: string;
  confirmMessage: string;
  remove: () => void | Promise<void>;
};

export default function AttachmentGrid({ items, emptyText }: { items: GridItem[]; emptyText: string }) {
  const images = items.filter((i) => i.isImage);
  const [open, setOpen] = useState<number | null>(null);
  const step = useCallback(
    (d: number) => setOpen((o) => (o === null || !images.length ? o : (o + d + images.length) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open !== null ? images[open] : null;

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {items.map((r) => (
          <div key={r.id} className="border border-neutral-800 bg-neutral-900 p-2 text-xs">
            {r.isImage ? (
              <button
                type="button"
                onClick={() => setOpen(images.findIndex((i) => i.id === r.id))}
                className="block w-full cursor-zoom-in"
                title="View full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={r.name} className="h-24 w-full object-cover" />
              </button>
            ) : (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="flex h-24 w-full items-center justify-center bg-neutral-950 text-neutral-500">PDF</div>
              </a>
            )}
            <div className="mt-1 truncate text-neutral-400" title={r.name}>
              {r.name}
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>{r.date}</span>
              <form action={r.remove}>
                <ConfirmSubmitButton confirmMessage={r.confirmMessage} className="text-red-400 hover:text-red-300">
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full text-sm text-neutral-500">{emptyText}</p>}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 print:hidden"
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-neutral-300">
            <span className="truncate">
              {current.name}
              {images.length > 1 && <span className="ml-2 text-neutral-500">{(open ?? 0) + 1} / {images.length}</span>}
            </span>
            <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
              <a href={current.url} target="_blank" rel="noopener noreferrer" className="border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800">
                Open original
              </a>
              <button type="button" onClick={() => setOpen(null)} className="border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800">
                Close (Esc)
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-900/80 px-3 py-4 text-xl hover:bg-neutral-800"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-900/80 px-3 py-4 text-xl hover:bg-neutral-800"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
