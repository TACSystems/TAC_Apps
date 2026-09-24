"use client";

import { useEffect, useRef } from "react";

const MESSAGE = "You have unsaved changes. Leave this page and lose them?";

declare global {
  var __taclogDirty: Set<symbol> | undefined;
}

function registry() {
  if (!globalThis.__taclogDirty) globalThis.__taclogDirty = new Set();
  return globalThis.__taclogDirty;
}

let listening = false;

function installGlobal() {
  if (listening) return;
  listening = true;
  window.addEventListener("beforeunload", (e) => {
    if (registry().size) {
      e.preventDefault();
      e.returnValue = MESSAGE;
    }
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!registry().size || e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        registry().clear();
      }
    },
    true
  );
}

export function useUnsaved(dirty: boolean) {
  const id = useRef(Symbol("unsaved"));
  useEffect(() => {
    installGlobal();
    const key = id.current;
    if (dirty) registry().add(key);
    else registry().delete(key);
    return () => {
      registry().delete(key);
    };
  }, [dirty]);
}

export function clearUnsaved() {
  registry().clear();
}

export default function UnsavedGuard() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    installGlobal();
    const form = marker.current?.closest("form");
    if (!form) return;
    const key = Symbol("form");
    const dirty = () => registry().add(key);
    const clean = () => registry().delete(key);
    form.addEventListener("input", dirty);
    form.addEventListener("change", dirty);
    form.addEventListener("submit", clean);
    return () => {
      form.removeEventListener("input", dirty);
      form.removeEventListener("change", dirty);
      form.removeEventListener("submit", clean);
      clean();
    };
  }, []);
  return <span ref={marker} hidden />;
}
