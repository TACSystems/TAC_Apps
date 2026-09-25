import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "@core/components/Icon";

export default function PageHeader({
  title,
  subtitle,
  back,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1 text-xs text-brand-amber hover:text-brand-amber-light">
            <Icon name="back" size={12} />
            {back.label}
          </Link>
        )}
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          {icon && <Icon name={icon} size={20} className="text-brand-amber" />}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {subtitle && <div className="text-sm text-neutral-400">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
