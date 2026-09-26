"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@core/components/Icon";

export type NavItem = { href: string; label: string; icon?: IconName };
export type NavEntry =
  | { kind: "link"; href: string; label: string; tour: string; icon: IconName }
  | { kind: "menu"; id: string; label: string; tour: string; icon: IconName; items: NavItem[]; match: string[] };

function onPath(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function Menu({
  id,
  label,
  icon,
  tour,
  items,
  active,
  open,
  setOpen,
  iconOnly = false,
  path,
}: {
  id: string;
  label: string;
  icon: IconName;
  tour: string;
  items: NavItem[];
  active: boolean;
  open: string | null;
  setOpen: (v: string | null) => void;
  iconOnly?: boolean;
  path: string;
}) {
  const isOpen = open === id;
  const best = items.filter((i) => onPath(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="relative" data-menu={id}>
      <button
        type="button"
        data-tour={tour}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        onClick={() => setOpen(isOpen ? null : id)}
        className={`inline-flex items-center gap-1.5 border-b-2 pb-0.5 text-xs ${active ? "border-brand-amber text-brand-amber" : "border-transparent hover:text-neutral-100"}`}
      >
        <Icon name={icon} size={iconOnly ? 18 : 14} />
        {!iconOnly && label}
        {!iconOnly && <span aria-hidden className="text-[9px]">▾</span>}
      </button>
      {isOpen && (
        <div role="menu" className={`absolute z-50 mt-2 min-w-[14rem] border border-neutral-700 bg-neutral-900 py-1 shadow-xl ${iconOnly ? "right-0" : "left-0"}`}>
          {items.map((i) => {
            const on = i.href === best;
            return (
              <Link
                key={i.href}
                role="menuitem"
                href={i.href}
                aria-current={on ? "page" : undefined}
                onClick={() => setOpen(null)}
                className={`flex items-center gap-2 px-3 py-2 text-xs ${on ? "text-brand-amber" : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"}`}
              >
                {i.icon && <Icon name={i.icon} size={14} />}
                {i.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NavLinks({ nav, gear }: { nav: NavEntry[]; gear: NavItem[] }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(null);
        setMobile(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const gearActive = gear.some((g) => onPath(path, g.href));
  const mobileItems: NavItem[] = [
    ...nav.flatMap((e) => (e.kind === "link" ? [{ href: e.href, label: e.label, icon: e.icon }] : [{ href: "", label: e.label }, ...e.items])),
    { href: "", label: "Settings" },
    ...gear,
  ];

  return (
    <div ref={root} className="flex items-center gap-x-5">
      <nav aria-label="Main" className="hidden items-center gap-x-5 md:flex">
        {nav.map((e) =>
          e.kind === "link" ? (
            <Link
              key={e.href}
              href={e.href}
              data-tour={e.tour}
              aria-current={onPath(path, e.href) ? "page" : undefined}
              onClick={() => setOpen(null)}
              className={`inline-flex items-center gap-1.5 border-b-2 pb-0.5 text-xs ${onPath(path, e.href) ? "border-brand-amber text-brand-amber" : "border-transparent hover:text-neutral-100"}`}
            >
              <Icon name={e.icon} size={14} />
              {e.label}
            </Link>
          ) : (
            <Menu
              key={e.id}
              id={e.id}
              label={e.label}
              icon={e.icon}
              tour={e.tour}
              items={e.items}
              active={e.match.some((m) => onPath(path, m))}
              open={open}
              setOpen={setOpen}
              path={path}
            />
          )
        )}
        <span className="h-4 w-px bg-neutral-700" aria-hidden="true" />
        <Menu id="gear" label="Settings and Controls" icon="settings" tour="nav-settings" items={gear} active={gearActive} open={open} setOpen={setOpen} iconOnly path={path} />
      </nav>
      <div className="relative md:hidden">
        <button type="button" aria-expanded={mobile} aria-label="Menu" onClick={() => setMobile(!mobile)} className="btn btn-secondary btn-sm">
          <Icon name={mobile ? "close" : "menu"} /> Menu
        </button>
        {mobile && (
          <div className="absolute right-0 z-50 mt-2 w-64 border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
            {mobileItems.map((i, k) =>
              i.href ? (
                <Link
                  key={`${i.href}-${k}`}
                  href={i.href}
                  onClick={() => setMobile(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                >
                  {i.icon && <Icon name={i.icon} size={14} />}
                  {i.label}
                </Link>
              ) : (
                <div key={`h-${k}`} className="mt-1 border-t border-neutral-800 px-3 pb-1 pt-2 text-[10px] tracking-[0.2em] text-neutral-500">
                  {i.label.toUpperCase()}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
