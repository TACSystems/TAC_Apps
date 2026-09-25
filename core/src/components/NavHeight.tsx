"use client";

import { useEffect } from "react";

export default function NavHeight() {
  useEffect(() => {
    const header = document.querySelector("header");
    const set = () => document.documentElement.style.setProperty("--tac-nav-h", `${header?.getBoundingClientRect().height ?? 0}px`);
    set();
    const ro = header ? new ResizeObserver(set) : null;
    if (header && ro) ro.observe(header);
    window.addEventListener("resize", set);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", set);
    };
  }, []);
  return null;
}
