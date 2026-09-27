import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import { listOptions } from "@/lib/db/dropdown-options";
import ClassForm from "@/components/ClassForm";
import { getDb } from "@/lib/db";
import { classDays, getClass } from "@/lib/classes";
import { todayISO } from "@core/lib/format";

export const dynamic = "force-dynamic";

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${klass.title}`} back={{ href: `/classes/${id}`, label: klass.title }} />
      <ClassForm
        klass={klass}
        today={todayISO()}
        classTypes={listOptions(db, "class_type")}
        days={classDays(db, klass.id)}
      />
    </div>
  );
}
