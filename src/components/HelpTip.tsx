"use client";

import { useState } from "react";

export default function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative ml-1 inline-block align-middle normal-case tracking-normal">
      <button
        type="button"
        aria-label="Help"
        title={text}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center border border-neutral-600 text-[10px] leading-none text-neutral-400 hover:border-brand-amber hover:text-brand-amber"
      >
        ?
      </button>
      {open && (
        <span role="tooltip" className="absolute left-0 top-5 z-50 w-64 border border-brand-amber bg-neutral-900 p-2 text-xs font-normal text-neutral-200 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
