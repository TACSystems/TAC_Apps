"use client";

import { useEffect } from "react";

export default function ToastOnLoad({ text, tone = "ok" }: { text: string; tone?: "ok" | "error" | "info" }) {
  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new CustomEvent("taclog:toast", { detail: { text, tone } })), 50);
    return () => window.clearTimeout(t);
  }, [text, tone]);
  return null;
}
