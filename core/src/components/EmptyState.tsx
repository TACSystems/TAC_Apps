import Link from "next/link";
import type { ReactNode } from "react";

export default function EmptyState({
  title,
  children,
  actions = [],
}: {
  title: string;
  children?: ReactNode;
  actions?: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="border border-dashed border-neutral-700 p-6">
      <div className="mb-1 text-sm text-neutral-200">{title}</div>
      {children && <div className="text-sm text-neutral-400">{children}</div>}
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={
                a.primary
                  ? "bg-brand-olive px-3 py-2 text-sm hover:bg-brand-olive-light"
                  : "border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
              }
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
