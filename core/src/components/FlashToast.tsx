"use client";

import { useEffect } from "react";

const NAME = "tac_flash";

function read() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=([^;]*)`));
  if (!m) return null;
  document.cookie = `${NAME}=; Max-Age=0; path=/; SameSite=Strict`;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as { text: string; tone?: "ok" | "error" | "info" };
  } catch {
    return null;
  }
}

export default function FlashToast() {
  useEffect(() => {
    const tick = () => {
      const f = read();
      if (f?.text) window.dispatchEvent(new CustomEvent("taclog:toast", { detail: { text: f.text, tone: f.tone ?? "ok" } }));
    };
    const t = window.setInterval(tick, 400);
    return () => window.clearInterval(t);
  }, []);
  return null;
}
