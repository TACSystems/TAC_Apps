import type { ReactNode } from "react";
import PrintButton from "@core/components/PrintButton";

export default function PrintSheet({
  title,
  subtitle,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="print-sheet space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <a className="btn" href={backHref}>
          ← {backLabel}
        </a>
        <PrintButton />
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-lg font-bold tracking-widest">TAC-QUAL · {title}</h1>
          {subtitle && <span className="text-sm tracking-widest text-neutral-400 print:text-black">{subtitle}</span>}
        </div>
        <div className="print-rule h-[3px] bg-[var(--tq-scarlet)]" />
      </header>

      {children}

      <footer className="pt-6 text-[10px] tracking-[0.2em] text-neutral-500 print:text-black">
        [ TAC-QUAL · POWERED BY TAC SYSTEMS ]
      </footer>
    </div>
  );
}
