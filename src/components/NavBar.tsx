import Link from "next/link";
import LockButton from "@/components/LockButton";

export default function NavBar({ showLock = false }: { showLock?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-700 bg-neutral-900">
      <div className="h-1 bg-brand-olive" />
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="relative flex flex-col leading-tight px-3 py-1.5">
          <span className="absolute left-0 top-0 h-2.5 w-2.5 border-t-2 border-l-2 border-brand-amber" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 border-t-2 border-r-2 border-brand-amber" />
          <span className="absolute left-0 bottom-0 h-2.5 w-2.5 border-b-2 border-l-2 border-brand-amber" />
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 border-b-2 border-r-2 border-brand-amber" />
          <span className="text-lg font-bold tracking-widest">TAC-LOG</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-400">
          <Link href="/inventory" className="hover:text-neutral-100">
            Armory
          </Link>
          <Link href="/ammo" className="hover:text-neutral-100">
            Ammo
          </Link>
          <Link href="/courses" className="hover:text-neutral-100">
            Courses of Fire
          </Link>
          <Link href="/range-log" className="hover:text-neutral-100">
            Range Log
          </Link>
          <Link href="/stats" className="hover:text-neutral-100">
            Stats
          </Link>

          <span className="mx-1 h-4 w-px bg-neutral-700" aria-hidden="true" />
          <Link href="/controls" className="hover:text-neutral-100">
            Controls
          </Link>
          <Link href="/settings" className="hover:text-neutral-100">
            Settings
          </Link>
          {showLock && <LockButton />}
        </div>
      </div>
    </header>
  );
}
