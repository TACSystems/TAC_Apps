import type { ReactNode } from "react";
import PageHeader from "@core/components/PageHeader";
import ClassCalendar from "@/components/ClassCalendar";
import CurrencyCard from "@/components/CurrencyCard";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayISO, type HomeSectionKey } from "@/lib/settings-shared";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

function count(db: ReturnType<typeof getDb>, sql: string) {
  return (db.prepare(sql).get() as { n: number }).n;
}

const QUICK_ACTIONS = [
  { label: "New Class", href: "/classes/new" },
  { label: "New Student", href: "/students/new" },
  { label: "Courses of Fire", href: "/courses" },
  { label: "Records", href: "/records" },
  { label: "Currency", href: "/records/currency" },
  { label: "Controls", href: "/controls" },
];

export default async function HomePage() {
  const db = getDb();
  const layout = getSettings(db).home;
  const today = todayISO();

  const students = count(db, `select count(*) as n from students where status = 'active'`);
  const classes = count(db, `select count(*) as n from classes`);
  const runs = count(db, `select count(*) as n from score_runs`);
  const passes = count(db, `select count(*) as n from score_runs where passed = 1`);
  const passRate = runs ? Math.round((passes / runs) * 1000) / 10 : null;

  const recent = db
    .prepare(
      `select id, number, title, date, location from classes
        where date < date('now') order by date desc limit ?`
    )
    .all(layout.recentCount) as {
    id: string;
    number: number;
    title: string;
    date: string;
    location: string | null;
  }[];

  const tiles = [
    { label: "Active students", value: students, href: "/students" },
    { label: "Classes", value: classes, href: "/classes" },
    { label: "Scored runs", value: runs, href: "/records" },
    { label: "Pass rate", value: passRate === null ? "—" : `${passRate}%`, href: "/records" },
  ];

  const sections: Record<HomeSectionKey, ReactNode> = {
    tiles: (
      <section data-section="tiles" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className="card p-4 transition-colors hover:border-brand-amber">
            <div className="text-xs tracking-widest text-neutral-400">{t.label}</div>
            <div className="count mt-1 text-3xl font-bold">{t.value}</div>
          </a>
        ))}
      </section>
    ),
    quick_actions: (
      <section data-section="quick_actions" className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <a key={a.href} href={a.href} className="btn btn-secondary">
            {a.label}
          </a>
        ))}
      </section>
    ),
    calendar: <ClassCalendar today={today} weeks={layout.calendarWeeks} />,
    currency: (
      <CurrencyCard
        today={today}
        dueSoonDays={layout.currencyDueSoonDays}
        hideCurrent={layout.currencyHideCurrent}
      />
    ),
    recent_classes: (
      <section data-section="recent_classes" className="space-y-3">
        <h2 className="text-sm tracking-widest text-neutral-400">Recent classes</h2>
        {recent.length === 0 ? (
          <p className="text-neutral-400">No classes have been run yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((c) => (
              <li key={c.id}>
                <a href={`/classes/${c.id}`} className="card flex flex-wrap justify-between gap-3 p-4">
                  <span className="font-bold">
                    #{String(c.number).padStart(4, "0")} · {c.title}
                  </span>
                  <span className="text-neutral-400">
                    {fd(c.date)}
                    {c.location ? ` · ${c.location}` : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    ),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="TAC-QUAL"
        subtitle="Class rosters, qualification scoring and printable results"
        actions={
          <div className="flex gap-2">
            <a className="btn" href="/students/new">
              + Student
            </a>
            <a className="btn btn-primary" href="/classes/new">
              + Class
            </a>
          </div>
        }
      />

      {layout.sections
        .filter((s) => s.visible)
        .map((s) => (
          <div key={s.key}>{sections[s.key]}</div>
        ))}
    </div>
  );
}
