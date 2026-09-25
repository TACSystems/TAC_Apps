"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { lockNow } from "@/app/lock/actions";

export default function IdleLock({ minutes }: { minutes: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!minutes) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await lockNow();
        router.refresh();
      }, minutes * 60_000);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, router]);
  return null;
}
