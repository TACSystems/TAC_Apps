import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { loadTargetType } from "@/lib/cof";
import TargetTypeEditor from "@/components/TargetTypeEditor";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteTargetType } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditTargetTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const db = getDb();
  const target = loadTargetType(db, id);
  if (!target) notFound();

  const courses = db
    .prepare(`select id, name, code from courses_of_fire where target_type_id = ? order by name`)
    .all(id) as { id: string; name: string; code: string }[];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/targets" className="text-xs text-brand-amber hover:text-brand-amber-light">
          ← Target Types
        </Link>
        <h1 className="text-xl font-semibold">{target.name}</h1>
        {courses.length > 0 && (
          <p className="mt-1 text-sm text-neutral-400">
            Changes apply to every course using this target: {courses.map((c) => c.code).join(", ")}. Runs
            you&apos;ve already logged keep the zone values they were scored with.
          </p>
        )}
      </div>

      <TargetTypeEditor key={id} initial={target} />

      <section className="border-t border-neutral-800 pt-4">
        {error === "in-use" && (
          <p className="mb-2 text-sm text-red-400">
            This target type is still used by {courses.length} course{courses.length === 1 ? "" : "s"}. Switch
            those courses to another target type first.
          </p>
        )}
        {courses.length === 0 ? (
          <form action={deleteTargetType.bind(null, id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete target type "${target.name}"? No courses use it. This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete Target Type
            </ConfirmSubmitButton>
          </form>
        ) : (
          <div className="text-sm text-neutral-500">
            Used by:{" "}
            {courses.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <Link href={`/courses/${c.id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {c.name}
                </Link>
              </span>
            ))}
            . It can be deleted once no course uses it.
          </div>
        )}
      </section>
    </div>
  );
}
