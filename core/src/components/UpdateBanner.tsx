"use client";

import { useEffect, useState } from "react";
import "@core/lib/desktop";
import type { UpdateState } from "@core/lib/desktop";
import Icon from "@core/components/Icon";

export default function UpdateBanner({ productName }: { productName: string }) {
  const [st, setSt] = useState<UpdateState | null>(null);
  const [notes, setNotes] = useState(false);

  useEffect(() => {
    let alive = true;
    window.taclog?.updateState?.().then((s) => alive && s && setSt(s));
    const on = (e: Event) => setSt((e as CustomEvent<UpdateState>).detail);
    window.addEventListener("taclog:update", on);
    return () => {
      alive = false;
      window.removeEventListener("taclog:update", on);
    };
  }, []);

  if (!st || !st.version) return null;
  const failed = st.status === "error" && !!st.url;
  if (!failed && !["available", "downloading", "ready", "installing"].includes(st.status)) return null;
  const act = (a: "open" | "skip" | "dismiss" | "install") => window.taclog?.updateAction?.(a).then((s) => s && setSt(s));

  return (
    <div role="status" data-update-banner className="border-b border-brand-amber bg-neutral-900 print:hidden">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6">
        <span className="flex items-center gap-2">
          <Icon name="download" className="text-brand-amber" />
          {failed ? (
            <span className="text-red-400">{st.error}</span>
          ) : st.status === "installing" ? (
            <span>Starting the {productName} {st.version} installer…</span>
          ) : st.status === "ready" ? (
            <span>
              {productName} {st.version} is downloaded and ready to install.
            </span>
          ) : st.status === "downloading" ? (
            <span>
              Downloading {productName} {st.version}… {st.progress ?? 0}%
            </span>
          ) : (
            <span>
              {productName} {st.version} is available. You have {st.current}.
              {st.note ? <span className="text-neutral-400"> {st.note}</span> : null}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {st.notes && (
            <button type="button" className="btn-link text-xs" onClick={() => setNotes(!notes)} aria-expanded={notes}>
              {notes ? "Hide what's new" : "What's new"}
            </button>
          )}
          {st.status === "ready" && st.canInstall ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => act("install")}>
              <Icon name="refresh" /> Restart to Update
            </button>
          ) : st.status === "available" || failed ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => act("open")}>
              <Icon name="download" /> Download
            </button>
          ) : null}
          {st.status !== "downloading" && st.status !== "installing" && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => act("dismiss")}>
                Later
              </button>
              <button type="button" className="btn-link text-xs" onClick={() => act("skip")}>
                Skip this version
              </button>
            </>
          )}
        </span>
      </div>
      {notes && st.notes && (
        <div className="mx-auto max-w-[1600px] px-4 pb-3 sm:px-6">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-neutral-800 bg-neutral-950 p-3 font-sans text-xs text-neutral-300">{st.notes}</pre>
        </div>
      )}
    </div>
  );
}
