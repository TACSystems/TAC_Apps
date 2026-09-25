"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Toast = { id: number; text: string; tone: "ok" | "error" | "info"; detail?: string };

type Ctx = {
  confirm: (o: ConfirmOptions | string) => Promise<boolean>;
  notify: (text: string, tone?: Toast["tone"], detail?: string) => void;
};

const DialogCtx = createContext<Ctx | null>(null);

declare global {
  interface Window {
    taclogConfirm?: Ctx["confirm"];
    taclogNotify?: Ctx["notify"];
  }
}

export function useDialogs(): Ctx {
  const c = useContext(DialogCtx);
  if (c) return c;
  return {
    confirm: async (o) => (window.taclogConfirm ? window.taclogConfirm(o) : false),
    notify: (t, tone, d) => window.taclogNotify?.(t, tone, d),
  };
}

function guessDanger(text: string) {
  return /\b(delete|remove|turn off|reset|replace everything|cannot be undone|restore)\b/i.test(text);
}

export default function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  const seq = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const onNav = (e: Event) => {
      const href = String((e as CustomEvent).detail ?? "");
      const url = new URL(href, window.location.href);
      router.push(url.pathname + url.search + url.hash);
    };
    window.addEventListener("taclog:navigate", onNav);
    return () => window.removeEventListener("taclog:navigate", onNav);
  }, [router]);

  const confirm = useCallback((o: ConfirmOptions | string) => {
    const opts = typeof o === "string" ? { message: o } : o;
    return new Promise<boolean>((resolve) => setPending({ danger: guessDanger(opts.message), ...opts, resolve }));
  }, []);

  const notify = useCallback((text: string, tone: Toast["tone"] = "info", detail?: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone, detail }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 9000 : 5000);
  }, []);

  useEffect(() => {
    window.taclogConfirm = confirm;
    window.taclogNotify = notify;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      notify(String(d.text ?? ""), d.tone ?? "info", d.detail);
    };
    window.addEventListener("taclog:toast", onToast);
    return () => window.removeEventListener("taclog:toast", onToast);
  }, [confirm, notify]);

  useEffect(() => {
    if (!pending) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        pending.resolve(false);
        setPending(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <DialogCtx.Provider value={{ confirm, notify }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 print:hidden" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title ?? "Confirm"}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md border bg-neutral-900 p-5 shadow-2xl ${pending.danger ? "border-red-800" : "border-brand-amber"}`}
          >
            <div className={`mb-2 text-sm tracking-[0.15em] ${pending.danger ? "text-red-300" : "text-brand-amber"}`}>
              {(pending.title ?? (pending.danger ? "Please confirm" : "Confirm")).toUpperCase()}
            </div>
            <p className="mb-5 whitespace-pre-line text-sm text-neutral-200">{pending.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => close(false)} className="btn btn-secondary">
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={okRef}
                type="button"
                onClick={() => close(true)}
                className={
                  pending.danger
                    ? "btn btn-danger"
                    : "btn btn-primary"
                }
              >
                {pending.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[85] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 print:hidden" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto border bg-neutral-900 px-4 py-3 text-sm shadow-xl ${
              t.tone === "error" ? "border-red-800 text-red-200" : t.tone === "ok" ? "border-brand-olive text-neutral-100" : "border-neutral-700 text-neutral-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{t.text}</span>
              <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-neutral-500 hover:text-neutral-200" aria-label="Dismiss">
                ✕
              </button>
            </div>
            {t.detail && <div className="mt-1 break-all text-xs text-neutral-400">{t.detail}</div>}
          </div>
        ))}
      </div>
    </DialogCtx.Provider>
  );
}
