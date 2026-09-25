"use client";

import type { ReactNode } from "react";
import { saveDashboardSection } from "@/app/dashboard-actions";
import { savePageSection } from "@/app/page-section-actions";

export default function Collapsible({
  id,
  title,
  keywords = "",
  defaultOpen = false,
  persist = false,
  aside,
  summary,
  scope,
  children,
}: {
  id: string;
  title: string;
  keywords?: string;
  defaultOpen?: boolean;
  persist?: boolean;
  aside?: ReactNode;
  summary?: ReactNode;
  scope?: string;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      data-section={id}
      data-keywords={`${title} ${keywords}`.toLowerCase()}
      open={defaultOpen}
      onToggle={(e) => {
        if (e.currentTarget.dataset.bulk === "1") return;
        if (scope) savePageSection(scope, id, e.currentTarget.open);
        else if (persist) saveDashboardSection(id, e.currentTarget.open);
      }}
      className="group border border-neutral-800 bg-neutral-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="inline-block w-3 text-brand-amber transition-transform group-open:rotate-90">▸</span>
          <h2 className="font-medium text-neutral-200">{title}</h2>
          {summary && (
            <span className="hidden sm:inline">
              <span className="text-xs text-neutral-500 group-open:hidden">{summary}</span>
            </span>
          )}
        </span>
        {aside && (
          <span className="text-xs text-neutral-500" onClick={(e) => e.stopPropagation()}>
            {aside}
          </span>
        )}
      </summary>
      <div className="border-t border-neutral-800 p-4">{children}</div>
    </details>
  );
}
