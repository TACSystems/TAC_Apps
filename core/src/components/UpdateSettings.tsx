"use client";

import { useEffect, useState } from "react";
import "@core/lib/desktop";
import type { UpdatePrefs, UpdateState } from "@core/lib/desktop";
import Spinner from "@core/components/Spinner";

function describe(st: UpdateState | null) {
  if (!st) return "";
  switch (st.status) {
    case "checking":
      return "Checking…";
    case "current":
      return `You're up to date${st.version ? ` (latest release ${st.version})` : ""}.`;
    case "available":
      return `Version ${st.version} is available.`;
    case "downloading":
      return `Downloading ${st.version}… ${st.progress ?? 0}%`;
    case "ready":
      return `Version ${st.version} is downloaded and ready to install.`;
    case "installing":
      return `Starting the ${st.version} installer…`;
    case "skipped":
      return `Version ${st.version} is available (you chose to skip it).`;
    case "dismissed":
      return `Version ${st.version} is available.`;
    case "error":
      return st.error ?? "Couldn't check for updates.";
    default:
      return "Not checked yet this session.";
  }
}

export default function UpdateSettings({ releasesUrl }: { releasesUrl: string }) {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<UpdatePrefs | null>(null);
  const [st, setSt] = useState<UpdateState | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const bridge = window.taclog;
      setDesktop(Boolean(bridge?.updatePrefs));
      bridge?.updatePrefs?.().then((p) => p && setPrefs(p));
      bridge?.updateState?.().then((s) => s && setSt(s));
    }, 0);
    const on = (e: Event) => setSt((e as CustomEvent<UpdateState>).detail);
    window.addEventListener("taclog:update", on);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("taclog:update", on);
    };
  }, []);

  if (desktop === null) return null;
  if (!desktop) {
    return (
      <p className="text-sm text-neutral-400">
        Updates are checked by the desktop app. New versions are posted at{" "}
        <a href={releasesUrl} className="btn-link" target="_blank" rel="noreferrer">
          {releasesUrl.replace("https://", "")}
        </a>
        .
      </p>
    );
  }

  const busy = st?.status === "checking" || st?.status === "downloading";
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center gap-2 normal-case">
        <input
          type="checkbox"
          checked={prefs?.autoCheck ?? true}
          onChange={async (e) => {
            const next = await window.taclog?.updatePrefs?.({ autoCheck: e.target.checked });
            if (next) setPrefs(next);
          }}
        />
        <span>Check for updates when TAC-LOG opens</span>
      </label>
      <p className="text-xs text-neutral-500">
        The check only asks GitHub which version is newest. None of your data leaves this computer. Windows downloads the update
        in the background and asks before installing; on the Mac you download and install it yourself.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => window.taclog?.updateAction?.("check").then((s) => s && setSt(s))}>
          {busy ? <Spinner /> : null} Check Now
        </button>
        {st?.status === "ready" && st.canInstall && (
          <button type="button" className="btn btn-primary" onClick={() => window.taclog?.updateAction?.("install")}>
            Restart to Update
          </button>
        )}
        {(st?.status === "available" || st?.status === "skipped" || st?.status === "dismissed") && !st.canInstall && (
          <button type="button" className="btn btn-primary" onClick={() => window.taclog?.updateAction?.("open")}>
            Download {st.version}
          </button>
        )}
        <span data-update-status className={st?.status === "error" ? "text-red-400" : "text-neutral-400"}>
          {describe(st)}
        </span>
      </div>
    </div>
  );
}
