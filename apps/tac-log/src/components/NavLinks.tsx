"use client";

import CoreNavLinks, { type NavEntry, type NavItem } from "@core/components/NavLinks";

const NAV: NavEntry[] = [
  { kind: "link", href: "/", label: "Home", tour: "nav-home", icon: "home" },
  {
    kind: "menu",
    id: "armory",
    label: "Armory",
    tour: "nav-armory",
    icon: "armory",
    match: ["/inventory", "/documents", "/reports"],
    items: [
      { href: "/inventory", label: "Firearms", icon: "armory" },
      { href: "/inventory/accessories", label: "Accessories", icon: "target" },
      { href: "/documents", label: "Permits & Documents", icon: "documents" },
      { href: "/reports/inventory", label: "Inventory Report", icon: "print" },
    ],
  },
  { kind: "link", href: "/ammo", label: "Ammo", tour: "nav-ammo", icon: "ammo" },
  {
    kind: "menu",
    id: "range",
    label: "Range",
    tour: "nav-range",
    icon: "range",
    match: ["/range-log", "/range-day", "/courses", "/targets", "/timer", "/checklist"],
    items: [
      { href: "/range-log", label: "Range Log", icon: "range" },
      { href: "/range-log/new", label: "Log a Range Session", icon: "plus" },
      { href: "/courses", label: "Courses of Fire", icon: "course" },
      { href: "/targets", label: "Target Types", icon: "target" },
      { href: "/timer", label: "Par Timer", icon: "timer" },
      { href: "/checklist", label: "Range Bag Checklist", icon: "checklist" },
    ],
  },
  { kind: "link", href: "/stats", label: "Stats", tour: "nav-stats", icon: "stats" },
];

const GEAR: NavItem[] = [
  { href: "/controls", label: "Controls", icon: "controls" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/help", label: "Help", icon: "help" },
  { href: "/settings/whats-new", label: "What's New", icon: "info" },
];

export default function NavLinks() {
  return <CoreNavLinks nav={NAV} gear={GEAR} />;
}
