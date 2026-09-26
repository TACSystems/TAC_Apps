"use client";

import CoreNavLinks, { type NavEntry, type NavItem } from "@core/components/NavLinks";

const NAV: NavEntry[] = [
  { kind: "link", href: "/", label: "Home", tour: "nav-home", icon: "home" },
  { kind: "link", href: "/classes", label: "Classes", tour: "nav-classes", icon: "course" },
  { kind: "link", href: "/students", label: "Students", tour: "nav-students", icon: "users" },
  {
    kind: "menu",
    id: "range",
    label: "Range",
    tour: "nav-range",
    icon: "range",
    match: ["/courses", "/targets", "/timer", "/checklist"],
    items: [
      { href: "/courses", label: "Courses of Fire", icon: "course" },
      { href: "/targets", label: "Target Types", icon: "target" },
      { href: "/timer", label: "Par Timer", icon: "timer" },
      { href: "/checklist", label: "Instructor Bag Checklist", icon: "checklist" },
    ],
  },
  {
    kind: "menu",
    id: "records",
    label: "Records",
    tour: "nav-records",
    icon: "stats",
    match: ["/records"],
    items: [
      { href: "/records", label: "Qualification Records", icon: "stats" },
      { href: "/records/currency", label: "Currency", icon: "clock" },
      { href: "/records/classes", label: "Class Archive", icon: "documents" },
    ],
  },
];

const GEAR: NavItem[] = [
  { href: "/instructor", label: "Instructor Profile", icon: "badge" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function NavLinks() {
  return <CoreNavLinks nav={NAV} gear={GEAR} />;
}
