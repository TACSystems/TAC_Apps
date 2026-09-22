import Link from "next/link";

export default function NavBar() {
  return (
    <header className="border-b border-neutral-700 bg-neutral-900">
      <div className="h-1 bg-blue-600" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="relative flex flex-col leading-tight px-3 py-1.5">
          <span className="absolute left-0 top-0 h-2.5 w-2.5 border-t-2 border-l-2 border-blue-400" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 border-t-2 border-r-2 border-blue-400" />
          <span className="absolute left-0 bottom-0 h-2.5 w-2.5 border-b-2 border-l-2 border-blue-400" />
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 border-b-2 border-r-2 border-blue-400" />
          <span className="text-lg font-semibold tracking-widest">TAC-LOG</span>
          <span className="text-[10px] tracking-[0.3em] text-neutral-500">Precision Systems</span>
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
          <span className="text-[10px] tracking-[0.2em] text-neutral-600">GROUP</span>
          <Link href="/participants" className="hover:text-neutral-100">
            Participants
          </Link>
          <Link href="/group-log" className="hover:text-neutral-100">
            Group Log
          </Link>
          <Link href="/group-stats" className="hover:text-neutral-100">
            Group Stats
          </Link>

          <span className="mx-1 h-4 w-px bg-neutral-700" aria-hidden="true" />
          <Link href="/controls" className="hover:text-neutral-100">
            Controls
          </Link>
        </div>
      </div>
    </header>
  );
}
