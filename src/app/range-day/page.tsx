import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { todayISO } from "@/lib/settings-shared";
import RangeDay from "@/components/RangeDay";

export const dynamic = "force-dynamic";

export default function RangeDayPage() {
  const db = getDb();
  const s = getSettings(db);
  const firearms = db
    .prepare(`select id, caliber, firearm_label(make_model, nickname) as label from firearms where status = 'active' order by make_model`)
    .all() as { id: string; caliber: string | null; label: string }[];
  const courses = db.prepare(`select id, name from courses_of_fire order by name`).all() as { id: string; name: string }[];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Range Day</h1>
        <p className="text-sm text-neutral-400">
          Log a whole trip at once: every firearm you shot, rounds, and ammo. Round counts, cleaning counters, and ammo on
          hand all update when you save.
        </p>
      </div>
      <RangeDay
        firearms={firearms}
        courses={courses}
        calibers={getDropdownOptions(db, "caliber")}
        locations={getDropdownOptions(db, "range_location")}
        weather={getDropdownOptions(db, "weather")}
        defaults={{ date: todayISO(), location: s.defaultRangeLocation, shooter: s.defaultShooterName || s.userName, deduct: s.deductManualRoundsByDefault }}
      />
    </div>
  );
}
