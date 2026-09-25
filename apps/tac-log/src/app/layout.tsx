import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import DialogProvider from "@core/components/Dialogs";
import SectionMemory from "@/components/SectionMemory";
import InlineValidation from "@core/components/InlineValidation";
import FlashToast from "@core/components/FlashToast";
import NavHeight from "@core/components/NavHeight";
import NavProgress from "@core/components/NavProgress";
import UpdateBanner from "@core/components/UpdateBanner";
import LockScreen from "@/components/LockScreen";
import IdleLock from "@/components/IdleLock";
import WhatsNewNotice from "@/components/WhatsNewNotice";
import { getDb } from "@/lib/db";
import { isUnlocked, lockoutSeconds, securityMode } from "@/lib/security-state";
import { getSettings } from "@/lib/settings";
import { TEXT_SCALE } from "@/lib/settings-shared";
import { whatsNewPending } from "@/lib/changelog";
import LaunchReminders from "@/components/LaunchReminders";
import { collectReminders, remindersDismissed } from "@/lib/reminders";

export const metadata: Metadata = {
  title: "TAC-LOG",
  description: "Firearm inventory, ammo tracking, courses of fire, and range session scoring. Powered by Precision Systems.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = securityMode();
  const unlocked = isUnlocked();

  if (!unlocked && mode !== "none") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-neutral-950 text-neutral-100">
          <LockScreen mode={mode} initialWaitSeconds={lockoutSeconds("unlock")} />
        </body>
      </html>
    );
  }

  const db = getDb();
  const settings = getSettings(db);
  const whatsNew = whatsNewPending(db);
  const reminders = settings.launchReminders && !remindersDismissed() ? collectReminders(db, settings) : [];

  return (
    <html lang="en" data-theme={settings.theme} style={{ fontSize: TEXT_SCALE[settings.textSize] }}>
      <body className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-brand-amber">
          Skip to content
        </a>
        <NavBar showLock={mode !== "none"} />
        <UpdateBanner productName="TAC-LOG" />
        {mode !== "none" && <IdleLock minutes={settings.autoLockMinutes} />}
        {whatsNew && <WhatsNewNotice version={whatsNew} />}
        <LaunchReminders items={reminders} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none sm:px-6">
          <DialogProvider>
            <SectionMemory />
            <InlineValidation />
            <FlashToast />
            <NavHeight />
            <Suspense fallback={null}>
              <NavProgress />
            </Suspense>
            {children}
          </DialogProvider>
        </main>
        <footer className="border-t border-neutral-800 py-3 text-center text-[11px] tracking-[0.25em] text-neutral-500 print:hidden">
          POWERED BY PRECISION SYSTEMS
          <div className="mt-0.5 text-[10px] tracking-[0.2em] text-neutral-500">v{process.env.TAC_LOG_VERSION ?? "dev"}</div>
        </footer>
      </body>
    </html>
  );
}
