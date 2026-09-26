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
  { kind: "link", href: "/records", label: "Records", tour: "nav-records", icon: "stats" },
];

const GEAR: NavItem[] = [{ href: "/instructor", label: "Instructor Profile", icon: "badge" }];

export default function NavLinks() {
  return <CoreNavLinks nav={NAV} gear={GEAR} />;
}
