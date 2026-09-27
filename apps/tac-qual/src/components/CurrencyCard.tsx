import Link from "next/link";
import { getDb } from "@/lib/db";
import { expiringCourseCount, qualificationCurrency, type CurrencyStatus } from "@/lib/records";
import { fd } from "@/lib/display";

const LABEL: Record<CurrencyStatus, string> = {
  current: "Current",
  due_soon: "Due soon",
  expired: "Expired",
  never: "Never passed",
};

const TONE: Record<CurrencyStatus, string> = {
  current: "text-green-400",
  due_soon: "text-brand-amber",
  expired: "text-red-400",
  never: "text-neutral-400",
};

const ORDER: CurrencyStatus[] = ["expired", "due_soon", "never", "current"];

export default function CurrencyCard({
  today,
  dueSoonDays,
  hideCurrent,
  limit = 8,
}: {
  today: string;
  dueSoonDays: number;
  hideCurrent: boolean;
  limit?: number;
}) {
  const db = getDb();
  const all = qualificationCurrency(db, today, dueSoonDays);
  const counts = ORDER.map((s) => [s, all.filter((r) => r.status === s).length] as const);
  const listed = (hideCurrent ? all.filter((r) => r.status !== "current") : all)
    .slice()
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.days_left ?? 1e9) - (b.days_left ?? 1e9))
    .slice(0, limit);

  return (
    <section className="card p-4" data-section="currency">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm tracking-widest text-neutral-400">Qualification currency</h2>
        <Link href="/records/currency" className="text-xs text-brand-amber hover:text-brand-amber-light">
          All currency
        </Link>
      </div>

      {expiringCourseCount(db) === 0 ? (
        <p className="text-sm normal-case text-neutral-400">
          No course expires yet. Set an expiry on a course under Scoring Setup and its students show up here.
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {counts.map(([s, n]) => (
              <div key={s} className="border border-neutral-800 p-2">
                <div className="text-[10px] tracking-widest text-neutral-500">{LABEL[s]}</div>
                <div className={`count text-xl font-bold ${TONE[s]}`}>{n}</div>
              </div>
            ))}
          </div>

          {listed.length === 0 ? (
            <p className="text-sm normal-case text-neutral-400">Everyone current.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {listed.map((r) => (
                <li key={`${r.student_id}:${r.cof_id}`}>
                  <Link
                    href={`/students/${r.student_id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm hover:text-brand-amber"
                  >
                    <span className="font-bold">{`${r.last_name}, ${r.first_name}`}</span>
                    <span className="text-xs normal-case text-neutral-400">
                      {r.course_code}
                      <span className={`ml-2 ${TONE[r.status]}`}>
                        {r.status === "never"
                          ? LABEL[r.status]
                          : r.days_left != null && r.days_left < 0
                            ? `expired ${fd(r.expires_on as string)}`
                            : `due ${fd(r.expires_on as string)}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
