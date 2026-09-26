import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import SubmitButton from "@core/components/SubmitButton";
import TargetEditorPanel from "@/components/TargetEditorPanel";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadTargetType } from "@core/lib/cof";
import { duplicateTarget, removeTarget, saveTargetTypeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const db = getDb();
  const targets = listTargetTypes(db);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Types"
        subtitle="Scoring zones and their point values. A course needs one before it can be scored."
      />

      {targets.map((t) => {
        const full = loadTargetType(db, t.id);
        return (
          <Collapsible
            key={t.id}
            scope="targets"
            id={`target-${t.id}`}
            title={t.name}
            defaultOpen={false}
            summary={`${full?.zones.length ?? 0} zones · ${t.course_count} course${t.course_count === 1 ? "" : "s"}`}
          >
            <div className="space-y-4 p-4">
              <TargetEditorPanel initial={full} saveAction={saveTargetTypeAction} />

              <div className="flex gap-2 border-t border-neutral-800 pt-4">
                <form action={duplicateTarget}>
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton className="btn btn-secondary" pendingLabel="Copying…">
                    Duplicate
                  </SubmitButton>
                </form>
                <form action={removeTarget}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmSubmitButton className="btn btn-danger" confirmMessage={`Delete ${t.name}?`}>
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          </Collapsible>
        );
      })}

      <Collapsible scope="targets" id="new-target" title="Add a Target Type" defaultOpen={targets.length === 0} summary="">
        <div className="p-4">
          <TargetEditorPanel saveAction={saveTargetTypeAction} />
        </div>
      </Collapsible>
    </div>
  );
}
