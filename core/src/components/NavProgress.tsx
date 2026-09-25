"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBusy(false);
  };

  useEffect(() => {
    const t = window.setTimeout(stop, 0);
    return () => window.clearTimeout(t);
  }, [path, search]);

  useEffect(() => {
    const start = () => {
      stop();
      timers.current.push(window.setTimeout(() => setBusy(true), 120));
      timers.current.push(window.setTimeout(stop, 15000));
      const main = document.querySelector("main");
      if (!main) return;
      const began = Date.now();
      const mo = new MutationObserver(() => {
        if (Date.now() - began > 150) {
          mo.disconnect();
          stop();
        }
      });
      mo.observe(main, { childList: true, subtree: true, characterData: true });
      timers.current.push(window.setTimeout(() => mo.disconnect(), 15000));
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onSubmit = (e: Event) => {
      if (!e.defaultPrevented) start();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden print:hidden">
      {busy && <div className="tac-progress h-full w-1/3 bg-brand-amber" />}
    </div>
  );
}
