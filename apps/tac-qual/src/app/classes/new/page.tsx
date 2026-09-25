import PageHeader from "@core/components/PageHeader";
import ClassForm from "@/components/ClassForm";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayISO } from "@core/lib/format";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const settings = getSettings(getDb());
  return (
    <div className="space-y-6">
      <PageHeader title="New Class" back={{ href: "/classes", label: "Classes" }} />
      <ClassForm defaultLocation={settings.defaultClassLocation} today={todayISO()} />
    </div>
  );
}
