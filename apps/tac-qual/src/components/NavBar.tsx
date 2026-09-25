import Link from "next/link";
import LockButton from "@/components/LockButton";
import NavLinks from "@/components/NavLinks";

export default function NavBar({ showLock = false }: { showLock?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-700 bg-neutral-900 print:hidden">
      <div className="h-1 bg-[var(--tq-scarlet)]" />
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="relative flex flex-col leading-tight px-3 py-1.5">
          <span className="absolute left-0 top-0 h-2.5 w-2.5 border-t-2 border-l-2 border-brand-amber" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 border-t-2 border-r-2 border-brand-amber" />
          <span className="absolute left-0 bottom-0 h-2.5 w-2.5 border-b-2 border-l-2 border-brand-amber" />
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 border-b-2 border-r-2 border-brand-amber" />
          <span className="text-lg font-bold tracking-widest">TAC-QUAL</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-400">
          <NavLinks />
          {showLock && <LockButton />}
        </div>
      </div>
    </header>
  );
}
