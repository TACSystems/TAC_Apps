import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import LockScreen from "@/components/LockScreen";
import IdleLock from "@/components/IdleLock";
import { getDb } from "@/lib/db";
import { isUnlocked, pinIsSet } from "@/lib/lock";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "TAC-LOG | Precision Systems",
  description: "Personal firearm inventory, ammo tracking, courses of fire, and range session scoring — by Precision Systems",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = getDb();
  const hasPin = pinIsSet(db);
  const unlocked = await isUnlocked();

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {unlocked ? (
          <>
            <NavBar showLock={hasPin} />
            {hasPin && <IdleLock minutes={getSettings(db).autoLockMinutes} />}
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          </>
        ) : (
          <LockScreen />
        )}
      </body>
    </html>
  );
}
