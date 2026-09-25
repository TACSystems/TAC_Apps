import PageHeader from "@core/components/PageHeader";
import { getDb } from "@/lib/db";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

function count(db: ReturnType<typeof getDb>, sql: string) {
  return (db.prepare(sql).get() as { n: number }).n;
}

export default async function HomePage() {
  const db = getDb();

  const students = count(db, `select count(*) as n from students where status = 'active'`);
  const classes = count(db, `select count(*) as n from classes`);
  const runs = count(db, `select count(*) as n from score_runs`);
  const passes = count(db, `select count(*) as n from score_runs where passed = 1`);
  const passRate = runs ? Math.round((passes / runs) * 1000) / 10 : null;

  const upcoming = db
    .prepare(
      `select id, number, title, date, location, status from classes
        where date >= date('now') order by date limit 5`
    )
    .all() as { id: string; number: number; title: string; date: string; location: string | null; status: string }[];

  const recent = db
    .prepare(
      `select id, number, title, date, location from classes
        where date < date('now') order by date desc limit 5`
    )
    .all() as { id: string; number: number; title: string; date: string; location: string | null }[];

  const tiles = [
    { label: "Active students", value: students, href: "/students" },
    { label: "Classes", value: classes, href: "/classes" },
    { label: "Scored runs", value: runs, href: "/records" },
    { label: "Pass rate", value: passRate === null ? "—" : `${passRate}%`, href: "/records" },
  ];

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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className="card p-4 transition-colors hover:border-brand-amber">
            <div className="text-xs tracking-widest text-neutral-400">{t.label}</div>
            <div className="mt-1 text-3xl font-bold">{t.value}</div>
          </a>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm tracking-widest text-neutral-400">Upcoming classes</h2>
        {upcoming.length === 0 ? (
          <p className="text-neutral-400">
            Nothing scheduled. <a href="/classes/new">Plan a class</a>.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li key={c.id}>
                <a href={`/classes/${c.id}`} className="brk card flex flex-wrap justify-between gap-3 p-4">
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

      <section className="space-y-3">
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
    </div>
  );
}
