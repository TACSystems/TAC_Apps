"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  { href: "/", label: "Home", tour: "nav-home" },
  { href: "/inventory", label: "Armory", tour: "nav-armory" },
  { href: "/documents", label: "Documents", tour: "nav-documents" },
  { href: "/ammo", label: "Ammo", tour: "nav-ammo" },
  { href: "/courses", label: "Courses of Fire", tour: "nav-courses" },
  { href: "/range-log", label: "Range Log", tour: "nav-rangelog" },
  { href: "/stats", label: "Stats", tour: "nav-stats" },
];
const SIDE = [
  { href: "/controls", label: "Controls", tour: "nav-controls" },
  { href: "/settings", label: "Settings", tour: "nav-settings" },
];

function active(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/courses") return path.startsWith("/courses") || path.startsWith("/targets");
  if (href === "/inventory") return path.startsWith("/inventory") || path.startsWith("/reports");
  return path === href || path.startsWith(`${href}/`);
}

export default function NavLinks() {
  const path = usePathname() ?? "/";
  const link = (l: { href: string; label: string; tour: string }) => {
    const on = active(path, l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        data-tour={l.tour}
        aria-current={on ? "page" : undefined}
        className={`border-b-2 pb-0.5 ${on ? "border-brand-amber text-brand-amber" : "border-transparent hover:text-neutral-100"}`}
      >
        {l.label}
      </Link>
    );
  };
  return (
    <>
      {MAIN.map(link)}
      <span className="mx-1 h-4 w-px bg-neutral-700" aria-hidden="true" />
      {SIDE.map(link)}
    </>
  );
}
