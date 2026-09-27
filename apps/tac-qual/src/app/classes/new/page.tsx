import PageHeader from "@core/components/PageHeader";
import { listOptions } from "@/lib/db/dropdown-options";
import ClassForm from "@/components/ClassForm";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayISO } from "@core/lib/format";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const db = getDb();
  const settings = getSettings(db);
  return (
    <div className="space-y-6">
      <PageHeader title="New Class" back={{ href: "/classes", label: "Classes" }} />
      <ClassForm
        defaultLocation={settings.defaultClassLocation}
        today={todayISO()}
        classTypes={listOptions(db, "class_type")}
        days={[]}
      />
    </div>
  );
}
