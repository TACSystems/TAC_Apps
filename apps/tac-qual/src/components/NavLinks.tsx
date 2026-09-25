"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", tour: "nav-home" },
  { href: "/classes", label: "Classes", tour: "nav-classes" },
  { href: "/students", label: "Students", tour: "nav-students" },
  { href: "/records", label: "Records", tour: "nav-records" },
  { href: "/courses", label: "Courses", tour: "nav-courses" },
  { href: "/targets", label: "Targets", tour: "nav-targets" },
  { href: "/timer", label: "Timer", tour: "nav-timer" },
  { href: "/instructor", label: "Instructor", tour: "nav-instructor" },
];

export default function NavLinks() {
  const pathname = usePathname() || "/";

  function active(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          data-tour={l.tour}
          aria-current={active(l.href) ? "page" : undefined}
          className={`border-b-[3px] px-3 py-1.5 text-xs tracking-widest transition-colors ${
            active(l.href)
              ? "border-[var(--tq-scarlet)] bg-neutral-800 text-neutral-100"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
