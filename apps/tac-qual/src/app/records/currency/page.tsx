import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { expiringCourseCount, qualificationCurrency, type CurrencyStatus } from "@/lib/records";
import { todayISO } from "@/lib/settings-shared";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

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

export default async function CurrencyPage() {
  const db = getDb();
  const today = todayISO();
  const rows = qualificationCurrency(db, today);
  const expiringCourses = expiringCourseCount(db);
  const count = (s: CurrencyStatus) => rows.filter((r) => r.status === s).length;

  const table: TableRow[] = rows.map((r) => ({
    key: `${r.student_id}:${r.cof_id}`,
    href: `/students/${r.student_id}`,
    text: `${r.last_name}, ${r.first_name} ${r.course_name} ${r.course_code} ${LABEL[r.status]}`,
    sort: {
      student: `${r.last_name}, ${r.first_name}`,
      course: r.course_name,
      passed: r.last_passed_date ?? "",
      expires: r.expires_on ?? "",
      status: r.days_left ?? 1e9,
    },
    cells: {
      student: <span className="font-bold">{`${r.last_name}, ${r.first_name}`}</span>,
      course: (
        <span>
          {r.course_name}
          <span className="block text-xs text-neutral-400">{r.course_code}</span>
        </span>
      ),
      passed: r.last_passed_date ? fd(r.last_passed_date) : "—",
      expires: r.expires_on ? fd(r.expires_on) : "—",
      status: (
        <span className={TONE[r.status]}>
          {LABEL[r.status]}
          {r.days_left != null && r.status !== "current" && (
            <span className="block text-xs text-neutral-500">
              {r.days_left < 0 ? `${Math.abs(r.days_left)} days ago` : `in ${r.days_left} days`}
            </span>
          )}
        </span>
      ),
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency"
        subtitle={
          expiringCourses === 0
            ? "No course expires yet. Set one on a course under Scoring Setup and its students appear here."
            : `${expiringCourses} course${expiringCourses === 1 ? "" : "s"} expire. A course with no expiry is left out — most civilian qualifications do not lapse.`
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["expired", "due_soon", "current", "never"] as CurrencyStatus[]).map((s) => (
          <div key={s} className="border border-neutral-800 p-3">
            <div className="text-xs tracking-widest text-neutral-500">{LABEL[s]}</div>
            <div className={`text-2xl font-bold ${TONE[s]}`}>{count(s)}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={expiringCourses === 0 ? "No course expires" : "Nothing scored yet"}>
          {expiringCourses === 0
            ? "Open a course, and under Scoring Setup set how many months a pass stays good for. Leave it blank on the courses that never lapse."
            : "Currency is worked out from scored runs. Score a relay in a class and it shows up here."}
        </EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "student", label: "Student", sortable: true },
            { key: "course", label: "Course", sortable: true },
            { key: "passed", label: "Last passed", align: "right", sortable: true },
            { key: "expires", label: "Current until", align: "right", sortable: true },
            { key: "status", label: "Status", sortable: true },
          ]}
          rows={table}
          initialSort={{ key: "status", dir: "asc" }}
          filterPlaceholder="Filter by student, course or status…"
        />
      )}

      <p className="text-xs text-neutral-500">
        Courses with no expiry set are left out entirely, as are inactive and archived students. <Link href="/records" className="text-brand-amber">Qualification Records</Link> shows
        every run, current or not.
      </p>
    </div>
  );
}
