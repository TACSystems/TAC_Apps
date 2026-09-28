import type { ReactNode } from "react";

export default function ControlsGroup({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section id={id} data-section={id} className="flex flex-col gap-2">
      <div className="mt-3 flex items-baseline gap-3 border-b border-neutral-800 pb-1">
        <h2 className="text-base text-brand-amber">{title}</h2>
        <span className="text-xs text-neutral-500">{blurb}</span>
      </div>
      {children}
    </section>
  );
}
