"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Tour from "@/components/Tour";
import PasswordInput from "@/components/PasswordInput";
import { finishTour, saveSetup } from "@/app/tour-actions";
import { DATE_FORMATS, FIREARM_LABEL_MODES } from "@/lib/settings-shared";

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case";

function Setup({ onNext, onSkip, canSetPin }: { onNext: () => void; onSkip: () => void; canSetPin: boolean }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dateFormat, setDateFormat] = useState("us");
  const [labelMode, setLabelMode] = useState("both");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSetup({ name, dateFormat, firearmLabel: labelMode, pin: pin || undefined, pinConfirm: pin2 });
      if (res.ok) onNext();
      else setError(res.error ?? "Couldn't save.");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 print:hidden" role="dialog" aria-modal="true" aria-label="Welcome to TAC-LOG">
      <div className="w-full max-w-lg border border-brand-amber bg-neutral-900 p-6">
        <div className="mb-1 text-[10px] tracking-[0.25em] text-neutral-500">SETUP {step + 1} OF 3</div>
        {step === 0 && (
          <>
            <h2 className="mb-2 text-lg text-brand-amber">Welcome to TAC-LOG</h2>
            <p className="mb-4 text-sm text-neutral-300">
              A few quick choices, then a short tour. Everything is stored only on this computer. You can change all of
              this later in Settings.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Used as the default shooter name" className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Date format
                <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={input}>
                  {Object.entries(DATE_FORMATS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Show firearms as
                <select value={labelMode} onChange={(e) => setLabelMode(e.target.value)} className={input}>
                  {Object.entries(FIREARM_LABEL_MODES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="mb-2 text-lg text-brand-amber">Lock TAC-LOG?</h2>
            <p className="mb-4 text-sm text-neutral-300">
              {canSetPin
                ? "A PIN keeps other people on this computer out of the app. Leave it blank to skip. For full encryption of your data with a password and recovery key, use Settings > Security later."
                : "TAC-LOG already has a PIN or password set. You can manage it in Settings > Security."}
            </p>
            {canSetPin && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  PIN (4–12 digits)
                  <PasswordInput inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Confirm PIN
                  <PasswordInput inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 12))} className={input} />
                </label>
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="mb-2 text-lg text-brand-amber">Bring in your records</h2>
            <p className="mb-2 text-sm text-neutral-300">
              Have a spreadsheet of your firearms and ammo? Import it any time from Settings &gt; Import / Export. TAC-LOG
              previews everything first and skips duplicates.
            </p>
            <p className="mb-4 text-sm text-neutral-300">Otherwise, start with + Add Firearm in the Armory.</p>
          </>
        )}
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onSkip} className="text-xs text-neutral-500 underline hover:text-neutral-300">
            Skip setup and tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800">
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && pin && pin !== pin2) {
                    setError("The two PIN entries don't match.");
                    return;
                  }
                  setError(null);
                  setStep(step + 1);
                }}
                className="bg-brand-olive px-4 py-1.5 text-sm hover:bg-brand-olive-light"
              >
                Next
              </button>
            ) : (
              <button type="button" disabled={pending} onClick={save} className="bg-brand-olive px-4 py-1.5 text-sm hover:bg-brand-olive-light disabled:opacity-60">
                {pending ? "Saving…" : "Save and start tour"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FirstRun({ status, canSetPin }: { status: "new" | "offer" | "done"; canSetPin: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const wantsTour = params.get("tour") === "1";
  const [phase, setPhase] = useState<"setup" | "tour" | "off">(status === "new" ? "setup" : "tour");
  const [, startTransition] = useTransition();

  if (status === "new" && phase === "setup") {
    return (
      <Setup
        canSetPin={canSetPin}
        onNext={() => setPhase("tour")}
        onSkip={() =>
          startTransition(async () => {
            await finishTour();
            setPhase("off");
            router.refresh();
          })
        }
      />
    );
  }
  if ((status === "new" && phase === "tour") || (wantsTour && phase === "tour")) {
    return <Tour onDone={() => setPhase("off")} />;
  }
  return null;
}
