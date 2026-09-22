"use client";

export default function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print border border-neutral-400 bg-neutral-100 px-4 py-2 text-sm font-medium text-black hover:bg-white"
    >
      {label}
    </button>
  );
}
