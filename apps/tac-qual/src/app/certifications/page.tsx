import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import CourseList, { type CourseCard } from "@core/components/CourseList";
import EmptyState from "@core/components/EmptyState";
import { normalizeCategories } from "@core/lib/course-categories";
import { getDb } from "@/lib/db";
import { listOptions } from "@/lib/db/dropdown-options";
import { certificationCourses, listCertifications } from "@/lib/certifications";

export const dynamic = "force-dynamic";

export default async function CertificationsPage() {
  const db = getDb();
  const certs = listCertifications(db);

  const cards: CourseCard[] = certs.map((c) => {
    const courses = certificationCourses(db, c.id);
    const cats = new Set<string>();
    for (const course of courses) {
      const row = db
        .prepare(`select categories_json from courses_of_fire where id = ?`)
        .get(course.cof_id) as { categories_json: string | null } | undefined;
      for (const k of normalizeCategories(row?.categories_json ?? null) ?? []) cats.add(k);
    }
    return {
      id: c.id,
      name: c.name,
      code: c.code ?? "",
      meta: `${courses.length} course${courses.length === 1 ? "" : "s"}`,
      href: `/certifications/${c.id}`,
      footer:
        c.issued_count === 0
          ? "No certificates issued"
          : `${c.issued_count} certificate${c.issued_count === 1 ? "" : "s"} issued`,
      categories: [...cats],
      links: [{ label: "Edit", href: `/certifications/${c.id}/edit` }],
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certifications"
        icon="badge"
        subtitle="What a student earns: a named set of courses of fire. A class taught from one brings its courses with it."
        actions={
          <Link className="btn btn-primary" href="/certifications/new">
            + Certification
          </Link>
        }
      />

      {certs.length === 0 ? (
        <EmptyState
          title="No certifications yet"
          actions={[{ href: "/certifications/new", label: "Build one", primary: true }]}
        >
          A certification is the credential a student walks away with. Name it, pick the courses they have to pass, and
          a student holds it the moment they have passed every one.
        </EmptyState>
      ) : (
        <CourseList
          courses={cards}
          categories={listOptions(db, "course_category")}
          searchPlaceholder="Search certifications by name or code…"
          emptyText="No certifications match."
        />
      )}
    </div>
  );
}
