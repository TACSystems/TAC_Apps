"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

function interactive(target: EventTarget | null) {
  return Boolean((target as HTMLElement | null)?.closest?.("a,button,input,select,textarea,label,form,summary"));
}

export default function ClickRow({
  href,
  as = "tr",
  className = "",
  children,
}: {
  href: string;
  as?: "tr" | "div";
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const props = {
    className: `${className} cursor-pointer`,
    onClick: (e: React.MouseEvent) => {
      if (interactive(e.target) || window.getSelection()?.toString()) return;
      if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
      else router.push(href);
    },
  };
  return as === "tr" ? <tr {...props}>{children}</tr> : <div {...props}>{children}</div>;
}
