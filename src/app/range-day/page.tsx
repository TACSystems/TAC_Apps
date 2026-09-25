import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { todayISO } from "@/lib/settings-shared";
import RangeDay from "@/components/RangeDay";
import Link from "next/link";
import { lastPicks, pickOptions } from "@/lib/ammo";

export const dynamic = "force-dynamic";

export default async function RangeDayPage({ searchParams }: { searchParams: Promise<{ date?: string; location?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const s = getSettings(db);
  const firearms = db
    .prepare(`select id, caliber, firearm_label(make_model, nickname) as label from firearms where status = 'active' order by make_model`)
    .all() as { id: string; caliber: string | null; label: string }[];
  const courses = db.prepare(`select id, name from courses_of_fire order by name`).all() as { id: string; name: string }[];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/range-log/new" className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Log a Range Session
        </Link>
        <h1 className="text-xl font-semibold">Log Practice</h1>
        <p className="text-sm text-neutral-400">
          Every firearm you shot, rounds, and the ammo used. Round counts, cleaning counters, and ammo on hand all update
          when you save.
        </p>
      </div>
      <RangeDay
        firearms={firearms}
        courses={courses}
        ammoOptions={pickOptions(db)}
        lastPicks={lastPicks(db)}
        locations={getDropdownOptions(db, "range_location")}
        weather={getDropdownOptions(db, "weather")}
        defaults={{
          date: sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO(),
          location: sp.location !== undefined ? String(sp.location).slice(0, 200) : s.defaultRangeLocation, shooter: s.defaultShooterName || s.userName, deduct: s.deductManualRoundsByDefault }}
      />
    </div>
  );
}
