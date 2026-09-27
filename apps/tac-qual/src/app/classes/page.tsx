import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import CourseList from "@core/components/CourseList";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { classNumberLabel, currentClasses } from "@/lib/classes";
import { listOptions } from "@/lib/db/dropdown-options";
import { todayISO } from "@/lib/settings-shared";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
};

export default async function ClassesPage() {
  const db = getDb();
  const classes = currentClasses(db, todayISO());

  const dates = (c: { day_count: number; first_day: string | null; last_day: string | null; date: string }) => {
    if (!c.day_count || !c.first_day) return fd(c.date);
    if (c.day_count === 1 || c.first_day === c.last_day) return fd(c.first_day);
    return `${fd(c.first_day)} → ${fd(c.last_day)} · ${c.day_count} days`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        icon="course"
        subtitle={`${classes.length} planned, running or recently finished`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/classes/new">
              + New Class
            </Link>
            <Link className="btn" href="/records/classes">
              Class Archive
            </Link>
          </div>
        }
      />

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" actions={[{ href: "/classes/new", label: "Plan a class", primary: true }]}>
          Classes you have finished are in the Class Archive.
        </EmptyState>
      ) : (
        <CourseList
          categories={listOptions(db, "class_type")}
          searchPlaceholder="Search classes by title, type or location…"
          emptyText="No classes match this filter."
          courses={classes.map((c) => ({
            id: c.id,
            href: `/classes/${c.id}`,
            name: c.title,
            code: classNumberLabel(c.number),
            categories: c.class_type ? [c.class_type] : [],
            meta: [classNumberLabel(c.number), dates(c), c.location].filter(Boolean).join(" · "),
            footer: `${STATUS_LABEL[c.status]} · ${c.students} enrolled · ${c.courses} course${
              c.courses === 1 ? "" : "s"
            } · ${c.runs} scored`,
            links: [
              { label: "Open", href: `/classes/${c.id}` },
              { label: "Edit", href: `/classes/${c.id}/edit` },
              { label: "Roster", href: `/classes/${c.id}/print/roster` },
            ],
          }))}
        />
      )}

      <p className="text-xs text-neutral-500">
        Class types come from Controls. A class with no type shows under Uncategorized. Finished classes older than
        about six weeks move to the <Link href="/records/classes" className="text-brand-amber">Class Archive</Link>.
      </p>
    </div>
  );
}
