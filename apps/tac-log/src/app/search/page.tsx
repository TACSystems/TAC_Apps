import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Firearm, AmmoPurchase, CourseOfFire, RangeLog } from "@/lib/db/types";
import { label, fd } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const db = getDb();

  let firearms: Firearm[] = [];
  let ammo: AmmoPurchase[] = [];
  let courses: CourseOfFire[] = [];
  let logs: (RangeLog & { cof_name: string | null })[] = [];

  if (query) {
    const needle = `%${query.toLowerCase()}%`;

    firearms = db
      .prepare(
        `select * from firearms
         where lower(make_model) like ? or lower(coalesce(nickname,'')) like ? or lower(coalesce(serial_number,'')) like ? or lower(coalesce(caliber,'')) like ?
         order by make_model`
      )
      .all(needle, needle, needle, needle) as Firearm[];

    ammo = db
      .prepare(
        `select * from ammo_purchases
         where lower(coalesce(manufacturer,'')) like ? or lower(caliber) like ? or lower(coalesce(ammo_type,'')) like ?
         order by date_purchased desc`
      )
      .all(needle, needle, needle) as AmmoPurchase[];

    courses = db
      .prepare(
        `select * from courses_of_fire
         where lower(name) like ? or lower(code) like ?
         order by name`
      )
      .all(needle, needle) as CourseOfFire[];

    logs = db
      .prepare(
        `select rl.*, c.name as cof_name
         from range_log rl
         left join courses_of_fire c on c.id = rl.cof_id
         where lower(coalesce(rl.range_location,'')) like ? or lower(coalesce(rl.notes,'')) like ? or rl.date like ?
         order by rl.date desc`
      )
      .all(needle, needle, needle) as (RangeLog & { cof_name: string | null })[];
  }

  const totalResults = firearms.length + ammo.length + courses.length + logs.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Search</h1>
        <form className="mt-2 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search firearms, ammo, courses, range log…"
            className="w-full max-w-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case"
          />
          <button
            type="submit"
            className="border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Search
          </button>
        </form>
      </div>

      {query && totalResults === 0 && (
        <p className="text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;.</p>
      )}

      {firearms.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium text-neutral-200">Armory</h2>
          <div className="flex flex-col gap-2">
            {firearms.map((f) => (
              <Link
                key={f.id}
                href={`/inventory/${f.id}`}
                className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
              >
                {label(f)} {f.caliber ? `· ${f.caliber}` : ""}
              </Link>
            ))}
          </div>
        </section>
      )}

      {ammo.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium text-neutral-200">Ammo</h2>
          <div className="flex flex-col gap-2">
            {ammo.map((a) => (
              <Link
                key={a.id}
                href="/ammo"
                className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
              >
                {a.caliber} · {a.manufacturer ?? "—"} · {a.ammo_type ?? "—"}
              </Link>
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium text-neutral-200">Courses of Fire</h2>
          <div className="flex flex-col gap-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
              >
                {c.name} · {c.code}
              </Link>
            ))}
          </div>
        </section>
      )}

      {logs.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium text-neutral-200">Range Log</h2>
          <div className="flex flex-col gap-2">
            {logs.map((l) => (
              <Link
                key={l.id}
                href={`/range-log/${l.id}`}
                className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
              >
                {fd(l.date)} · {l.cof_name ?? "Unlisted course"} · {l.range_location ?? "—"}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
